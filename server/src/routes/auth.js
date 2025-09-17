import express from 'express';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/db.js';
import { transporter } from '../config/email.js';
import { prettyLog } from '../config/logger.js';

const router = express.Router();

// Validate Reset Token Endpoint (Unchanged)
router.get('/validate-reset-token', async (req, res) => {
  const { token, email_id } = req.query;
  console.info('[Auth][ValidateToken] Validate reset token request received:', { email_id, hasToken: !!token });
  prettyLog('Validate reset token request received', { email_id, hasToken: !!token }, { level: 'info' });
  
  if (!email_id || !token) {
    console.warn('[Auth][ValidateToken] Validation failed - missing parameters:', { email_id, hasToken: !!token });
    prettyLog('Validation failed - missing parameters', { email_id, hasToken: !!token }, { level: 'warn' });
    return res.status(400).json({ success: false, message: 'Email and token are required' });
  }

  try {
    const result = await pool.query(
      'SELECT * FROM password_reset_tokens WHERE email_id = $1 AND token = $2',
      [email_id, token]
    );
    
    console.debug('[Auth][ValidateToken] Token validation query result:', { found: result.rows.length > 0, email_id, rowCount: result.rows.length });
    prettyLog('Token validation query result', {
      found: result.rows.length > 0,
      email_id,
      rowCount: result.rows.length
    }, { level: 'debug' });
    
    if (result.rows.length === 0) {
      console.warn('[Auth][ValidateToken] No valid token found:', email_id);
      prettyLog('No valid token found', { email_id }, { level: 'warn' });
      return res.status(400).json({ success: false, message: 'Password is already changed' });
    }

    console.info('[Auth][ValidateToken] Token validation successful:', email_id);
    prettyLog('Token validation successful', { email_id }, { level: 'info' });
    res.status(200).json({ success: true, message: 'Token is valid' });
  } catch (error) {
    console.error('[Auth][ValidateToken] Validate reset token error:', error.message);
    prettyLog('Validate reset token error', { error: error.message, email_id }, { level: 'error' });
    res.status(500).json({ success: false, message: 'Server error', details: error.message });
  }
});

// Forgot Password Endpoint (Unchanged)
router.post('/forgot-password', async (req, res) => {
  const { email_id } = req.body;
  console.info('[Auth][ForgotPassword] Forgot password request received:', email_id);
  prettyLog('Forgot password request received', { email_id }, { level: 'info' });
  
  if (!email_id) {
    console.warn('[Auth][ForgotPassword] Forgot password failed - missing email');
    prettyLog('Forgot password failed - missing email', { email_id }, { level: 'warn' });
    return res.status(400).json({ success: false, message: 'Email is required' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email_id)) {
    console.warn('[Auth][ForgotPassword] Invalid email format provided:', email_id);
    prettyLog('Invalid email format provided', { email_id }, { level: 'warn' });
    return res.status(400).json({ success: false, message: 'Invalid email format' });
  }

  try {
    await pool.query('BEGIN');

    const userCheck = await pool.query(
      'SELECT * FROM user_login WHERE email_id = $1 AND role = $2 AND status = $3',
      [email_id, 'underwriter', 'approved']
    );
    
    console.debug('[Auth][ForgotPassword] User verification result:', { email_id, found: userCheck.rows.length > 0, userCount: userCheck.rows.length });
    prettyLog('User verification result', { 
      email_id, 
      found: userCheck.rows.length > 0,
      userCount: userCheck.rows.length 
    }, { level: 'debug' });

    if (userCheck.rows.length === 0) {
      await pool.query('ROLLBACK');
      console.warn('[Auth][ForgotPassword] No approved underwriter found:', email_id);
      prettyLog('No approved underwriter found', { email_id }, { level: 'warn' });
      return res.status(404).json({ success: false, message: 'No approved underwriter found with this email' });
    }

    const resetToken = uuidv4();
    const expiresAt = new Date(Date.now() + 3600 * 1000);
    
    console.info('[Auth][ForgotPassword] Generated reset token:', { email_id, tokenGenerated: true, expiresAt: expiresAt.toISOString() });
    prettyLog('Generated reset token', { 
      email_id, 
      tokenGenerated: true,
      expiresAt: expiresAt.toISOString()
    }, { level: 'info' });

    await pool.query(
      'INSERT INTO password_reset_tokens (email_id, token, expires_at) VALUES ($1, $2, $3) ON CONFLICT (email_id, token) DO UPDATE SET expires_at = $3 RETURNING *',
      [email_id, resetToken, expiresAt]
    );
    
    console.info('[Auth][ForgotPassword] Reset token stored successfully:', email_id);
    prettyLog('Reset token stored successfully', { email_id }, { level: 'info' });

    const resetLink = `http://13.202.6.228:5173/reset-password?token=${resetToken}&email_id=${encodeURIComponent(email_id)}`;
    let emailError = null;
    
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email_id,
        subject: 'Password Reset Request - Kazunov 1AI',
        html: `
          <p>Dear Underwriter,</p>
          <p>You requested to reset your password for your Kazunov 1AI account.</p>
          <p>Click the link below to set a new password:</p>
          <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background-color: #3371F2; color: white; text-decoration: none; border-radius: 6px;">Reset Password</a>
          <p>This link can only be used once. If you did not request this, please ignore this email or contact support.</p>
          <p>Best regards,<br>Kazunov 1AI Team</p>
        `,
      });
      console.info('[Auth][ForgotPassword] Password reset email sent successfully:', email_id);
      prettyLog('Password reset email sent successfully', { email_id }, { level: 'info' });
    } catch (err) {
      console.error('[Auth][ForgotPassword] Failed to send reset email:', err.message);
      prettyLog('Failed to send reset email', { email_id, error: err.message }, { level: 'error' });
      emailError = err.message;
    }

    await pool.query('COMMIT');
    
    if (emailError) {
      console.warn('[Auth][ForgotPassword] Password reset link generated but email failed:', { email_id, error: emailError });
      prettyLog('Password reset link generated but email failed', { email_id, error: emailError }, { level: 'warn' });
      return res.status(200).json({
        success: true,
        message: `Password reset link generated, but failed to send email: ${emailError}. Use this link to reset: ${resetLink}`,
      });
    }
    
    console.info('[Auth][ForgotPassword] Password reset process completed successfully:', email_id);
    prettyLog('Password reset process completed successfully', { email_id }, { level: 'info' });
    res.status(200).json({ success: true, message: 'Password reset link sent to your email' });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('[Auth][ForgotPassword] Forgot password operation failed:', error.message);
    prettyLog('Forgot password operation failed', { email_id, error: error.message }, { level: 'error' });
    res.status(500).json({ success: false, message: 'Server error', details: error.message });
  }
});

// Reset Password Endpoint (Unchanged)
router.post('/reset-password', async (req, res) => {
  const { token, email_id, new_password } = req.body;
  prettyLog('Reset password request', { email_id, hasToken: !!token, hasPassword: !!new_password });
  
  if (!email_id || !token || !new_password) {
    prettyLog('Reset password failed - missing parameters', { 
      email_id: !!email_id, 
      token: !!token, 
      new_password: !!new_password 
    });
    return res.status(400).json({ success: false, message: 'Email, token, and new password are required' });
  }

  try {
    await pool.query('BEGIN');

    const result = await pool.query(
      'SELECT * FROM password_reset_tokens WHERE email_id = $1 AND token = $2',
      [email_id, token]
    );
    
    prettyLog('Token validation for reset', { 
      email_id, 
      tokenFound: result.rows.length > 0 
    });

    if (result.rows.length === 0) {
      await pool.query('ROLLBACK');
      prettyLog('Invalid or expired token for reset', { email_id });
      return res.status(400).json({ success: false, message: 'Password is already changed' });
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);
    prettyLog('Password hashed for user', { email_id });

    const updateResult = await pool.query(
      'UPDATE user_login SET password = $1 WHERE email_id = $2 AND role = $3 AND status = $4 RETURNING email_id',
      [hashedPassword, email_id, 'underwriter', 'approved']
    );
    
    prettyLog('Password update result', { 
      email_id, 
      updated: updateResult.rows.length > 0,
      rowsAffected: updateResult.rows.length 
    });

    if (updateResult.rows.length === 0) {
      await pool.query('ROLLBACK');
      prettyLog('No user found for password update', { email_id });
      return res.status(404).json({ success: false, message: 'No approved underwriter found with this email' });
    }

    const deleteResult = await pool.query(
      'DELETE FROM password_reset_tokens WHERE email_id = $1 AND token = $2 RETURNING *',
      [email_id, token]
    );
    
    prettyLog('Reset token cleanup', { 
      email_id, 
      tokensDeleted: deleteResult.rows.length 
    });

    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email_id,
        subject: 'Password Reset Successful - Kazunov 1AI',
        html: `
          <p>Dear Underwriter,</p>
          <p>Your password for your Kazunov 1AI account has been successfully reset.</p>
          <p>You can now log in with your new password at <a href="http://13.202.6.228:5173/login">Kazunov 1AI</a>.</p>
          <p>If you did not initiate this change, please contact support immediately.</p>
          <p>Best regards,<br>Kazunov 1AI Team</p>
        `,
      });
      prettyLog('Password reset confirmation email sent', { email_id });
    } catch (emailError) {
      prettyLog('Failed to send confirmation email', { 
        email_id, 
        error: emailError.message 
      });
    }

    await pool.query('COMMIT');
    prettyLog('Password reset completed successfully', { email_id });
    res.status(200).json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    await pool.query('ROLLBACK');
    prettyLog('Password reset operation failed', { 
      email_id, 
      error: error.message 
    });
    res.status(500).json({ success: false, message: 'Server error', details: error.message });
  }
});

// Register Endpoint (Unchanged)
router.post('/register', async (req, res) => {
  const { name, email_id, password } = req.body;
  prettyLog('Registration request received', { 
    name, 
    email_id, 
    hasPassword: !!password 
  });

  if (!name || !email_id || !password) {
    prettyLog('Registration failed - missing required fields');
    return res.status(400).json({ success: false, message: 'All fields (name, email_id, password) are required' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email_id)) {
    prettyLog('Registration failed - invalid email format', { email_id });
    return res.status(400).json({ success: false, message: 'Invalid email format' });
  }

  try {
    await pool.query('BEGIN');

    const userCheck = await pool.query('SELECT * FROM user_login WHERE email_id = $1', [email_id]);
    const pendingCheck = await pool.query('SELECT * FROM pending_users WHERE email_id = $1', [email_id]);
    
    prettyLog('Email existence check', { 
      email_id,
      existsInUserLogin: userCheck.rows.length > 0,
      existsInPending: pendingCheck.rows.length > 0
    });

    if (userCheck.rows.length > 0 || pendingCheck.rows.length > 0) {
      await pool.query('ROLLBACK');
      prettyLog('Registration failed - email already exists', { email_id });
      return res.status(409).json({ success: false, message: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    prettyLog('Password hashed for registration', { email_id });

    const adminRes = await pool.query("SELECT email_id FROM user_login WHERE role = 'admin'");
    const admins = adminRes.rows;
    
    prettyLog('Admin lookup result', { 
      adminCount: admins.length,
      adminEmails: admins.map(admin => admin.email_id)
    });

    const fallbackAdminEmail = process.env.EMAIL_USER;
    const validAdmins = admins.length > 0 
      ? admins.filter(admin => emailRegex.test(admin.email_id))
      : (fallbackAdminEmail && emailRegex.test(fallbackAdminEmail) ? [{ email_id: fallbackAdminEmail }] : []);
    
    prettyLog('Valid admin emails determined', { 
      validAdminCount: validAdmins.length,
      validAdmins: validAdmins.map(admin => admin.email_id)
    });

    if (validAdmins.length === 0) {
      await pool.query('ROLLBACK');
      prettyLog('Registration failed - no valid admin emails');
      return res.status(500).json({ success: false, message: 'No valid admin email addresses found' });
    }

    const approvalTokens = {};
    validAdmins.forEach(admin => {
      approvalTokens[admin.email_id] = uuidv4();
    });

    await pool.query(
      'INSERT INTO pending_users (email_id, name, password, status, approval_tokens) VALUES ($1, $2, $3, $4, $5)',
      [email_id, name, hashedPassword, 'pending', JSON.stringify(approvalTokens)]
    );
    
    prettyLog('User added to pending table', { email_id, name });

    let emailErrors = [];
    let smtpVerified = false;
    
    try {
      await new Promise((resolve, reject) => {
        transporter.verify((error, success) => {
          if (error) {
            prettyLog('SMTP verification failed', { error: error.message });
            reject(error);
          } else {
            prettyLog('SMTP configuration verified successfully');
            smtpVerified = true;
            resolve();
          }
        });
      });
    } catch (error) {
      emailErrors.push(`SMTP verification failed: ${error.message}`);
    }

    if (smtpVerified) {
      for (let i = 0; i < validAdmins.length; i++) {
        const admin = validAdmins[i];
        const approvalLink = `http://13.202.6.228:5000/api/approve?token=${approvalTokens[admin.email_id]}&email_id=${encodeURIComponent(email_id)}`;
        
        try {
          await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: admin.email_id,
            subject: 'New User Registration Approval Required',
            html: `
              <p>Dear Admin,</p>
              <p>A new user (${name}, ${email_id}) has requested registration as an underwriter.</p>
              <p>Please approve or reject this request:</p>
              <a href="${approvalLink}">Approve Registration</a>
            `,
          });
          prettyLog('Approval email sent to admin', { adminEmail: admin.email_id });
        } catch (emailError) {
          prettyLog('Failed to send approval email', { 
            adminEmail: admin.email_id, 
            error: emailError.message 
          });
          emailErrors.push(`Failed to send email to ${admin.email_id}: ${emailError.message}`);
        }
        
        if (i < validAdmins.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    } else {
      prettyLog('Email sending skipped due to SMTP verification failure');
      emailErrors.push('Email sending skipped due to invalid SMTP configuration');
    }

    await pool.query('COMMIT');
    prettyLog('Registration process completed', { 
      email_id, 
      emailErrorCount: emailErrors.length 
    });
    
    res.status(201).json({
      success: true,
      message: emailErrors.length > 0
        ? `Registration submitted, but some emails failed to send: ${emailErrors.join('; ')}`
        : 'Registration submitted, awaiting admin approval'
    });
  } catch (error) {
    await pool.query('ROLLBACK');
    prettyLog('Registration operation failed', { 
      email_id, 
      error: error.message, 
      code: error.code 
    });
    
    if (error.code === '23505') {
      res.status(409).json({ success: false, message: 'Email already exists' });
    } else if (error.code === '23502') {
      res.status(400).json({ success: false, message: 'Missing required field' });
    } else {
      res.status(500).json({ success: false, message: 'Server error', details: error.message });
    }
  }
});

// Approval Endpoint (Unchanged)
router.get('/approve', async (req, res) => {
  const { token, email_id } = req.query;
  prettyLog('Approval request received', { email_id, hasToken: !!token });
  
  try {
    await pool.query('BEGIN');

    const result = await pool.query('SELECT * FROM pending_users WHERE email_id = $1', [email_id]);
    
    prettyLog('Pending user lookup', { 
      email_id, 
      found: result.rows.length > 0 
    });

    if (result.rows.length === 0) {
      await pool.query('ROLLBACK');
      prettyLog('Approval failed - no pending user found', { email_id });
      return res.status(400).send('Invalid or expired token');
    }

    const pendingUser = result.rows[0];
    const tokens = pendingUser.approval_tokens;
    const isValidToken = Object.values(tokens).includes(token);
    
    prettyLog('Token validation for approval', { 
      email_id, 
      tokenValid: isValidToken 
    });

    if (!isValidToken) {
      await pool.query('ROLLBACK');
      prettyLog('Approval failed - invalid token', { email_id });
      return res.status(400).send('Invalid or expired token');
    }

    await pool.query(
      'INSERT INTO user_login (email_id, name, password, role, status, created_date) VALUES ($1, $2, $3, $4, $5, $6)',
      [pendingUser.email_id, pendingUser.name, pendingUser.password, 'underwriter', 'approved', new Date()]
    );

    await pool.query('DELETE FROM pending_users WHERE email_id = $1', [email_id]);
    
    prettyLog('User approved and moved to user_login', { 
      email_id, 
      name: pendingUser.name 
    });

    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email_id,
        subject: 'Registration Approved',
        html: `
          <p>Dear ${pendingUser.name},</p>
          <p>Your registration has been approved! You can now log in at <a href="http://13.202.6.228:5173/login">Kazunov 1AI</a>.</p>
        `,
      });
      prettyLog('Approval confirmation email sent', { email_id });
    } catch (emailError) {
      prettyLog('Failed to send approval confirmation email', { 
        email_id, 
        error: emailError.message 
      });
    }

    await pool.query('COMMIT');
    prettyLog('Approval process completed successfully', { email_id });
    res.send('Registration approved successfully! The user can now log in.');
  } catch (error) {
    await pool.query('ROLLBACK');
    prettyLog('Approval operation failed', { 
      email_id, 
      error: error.message 
    });
    res.status(500).send('Server error');
  }
});

// Login Endpoint (Updated)
router.post('/login', async (req, res) => {
  const { email_id, password } = req.body;
  console.info('[Auth][Login] Login attempt received:', { email_id, hasPassword: !!password });
  prettyLog('Login attempt received', { email_id, hasPassword: !!password }, { level: 'info' });
  
  if (!email_id || !password) {
    console.warn('[Auth][Login] Login failed - missing credentials');
    prettyLog('Login failed - missing credentials', { email_id }, { level: 'warn' });
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }

  try {
    const result = await pool.query(
      'SELECT email_id, name, password, role, status, created_date FROM user_login WHERE email_id = $1', 
      [email_id]
    );
    
    console.debug('[Auth][Login] User lookup for login:', { email_id, userFound: result.rows.length > 0 });
    prettyLog('User lookup for login', { 
      email_id, 
      userFound: result.rows.length > 0 
    }, { level: 'debug' });

    if (result.rows.length === 0) {
      console.warn('[Auth][Login] Login failed - user not found:', email_id);
      prettyLog('Login failed - user not found', { email_id }, { level: 'warn' });
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const user = result.rows[0];
    console.debug('[Auth][Login] User details retrieved:', { email_id: user.email_id, name: user.name, role: user.role, status: user.status });
    prettyLog('User details retrieved', {
      email_id: user.email_id,
      name: user.name,
      role: user.role,
      status: user.status
    }, { level: 'debug' });

    const isMatch = await bcrypt.compare(password, user.password);
    console.debug('[Auth][Login] Password verification result:', { email_id, passwordMatch: isMatch });
    prettyLog('Password verification result', { email_id, passwordMatch: isMatch }, { level: 'debug' });

    if (!isMatch) {
      console.warn('[Auth][Login] Login failed - incorrect password:', email_id);
      prettyLog('Login failed - incorrect password', { email_id }, { level: 'warn' });
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (user.role !== 'underwriter' || user.status !== 'approved') {
      console.warn('[Auth][Login] Login failed - access denied:', { email_id, role: user.role, status: user.status });
      prettyLog('Login failed - access denied', { 
        email_id, 
        role: user.role, 
        status: user.status 
      }, { level: 'warn' });
      return res.status(403).json({ success: false, message: 'Access denied: Only approved underwriters are allowed' });
    }

    const userDetails = {
      email_id: user.email_id,
      name: user.name,
      role: user.role,
      status: user.status,
      created_date: user.created_date
    };

    console.info('[Auth][Login] Login successful:', { email_id, name: user.name, role: user.role });
    prettyLog('Login successful', { email_id, name: user.name, role: user.role }, { level: 'info' });
    
    res.status(200).json({ 
      success: true, 
      message: 'Login successful', 
      user: userDetails 
    });
  } catch (error) {
    console.error('[Auth][Login] Login operation failed:', error.message);
    prettyLog('Login operation failed', { 
      email_id, 
      error: error.message 
    }, { level: 'error' });
    res.status(500).json({ success: false, message: 'Server error', details: error.message });
  }
});

// Current User Endpoint (Updated)
router.get('/current-user/:email_id', async (req, res) => {
  const { email_id } = req.params;
  prettyLog('Current user lookup request', { email_id });
  
  try {
    const result = await pool.query(
      'SELECT email_id, name, role, status, created_date FROM user_login WHERE email_id = $1 AND role = $2 AND status = $3',
      [email_id, 'underwriter', 'approved']
    );

    prettyLog('Current user query result', { 
      email_id, 
      found: result.rows.length > 0 
    });

    if (result.rows.length === 0) {
      prettyLog('Current user not found', { email_id });
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    prettyLog('Current user details', user);
    
    res.json(user);
  } catch (error) {
    prettyLog('Current user lookup failed', { 
      email_id, 
      error: error.message 
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;