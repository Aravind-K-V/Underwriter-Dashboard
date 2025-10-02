import psycopg2
import json
import os
from typing import List, Dict, Any
import logging
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables from .env file in parent directory
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class MedicalDataExtractor:
    def __init__(self):
        """
        Initialize the Medical Data Extractor with database config from .env file
        """
        self.db_config = self._load_db_config()
        self.connection = None
    
    def _load_db_config(self) -> Dict[str, str]:
        """
        Load database configuration from environment variables
        
        Returns:
            Dictionary containing database connection parameters
        """
        db_config = {
            'host': os.getenv('DB_HOST'),
            'database': os.getenv('DB_NAME'),
            'user': os.getenv('DB_USER'),
            'password': os.getenv('DB_PASSWORD'),
            'port': int(os.getenv('DB_PORT'))
        }
        
        # Validate required environment variables
        required_vars = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'DB_PORT']
        missing_vars = [var for var in required_vars if not os.getenv(var)]
        
        if missing_vars:
            logger.error(f"Missing required environment variables: {missing_vars}")
            raise ValueError(f"Missing required environment variables: {missing_vars}")
        
        logger.info(f"Database config loaded - Host: {db_config['host']}, Database: {db_config['database']}")
        return db_config
    
    def connect_database(self) -> bool:
        """
        Establish connection to PostgreSQL database
        
        Returns:
            bool: True if connection successful, False otherwise
        """
        try:
            self.connection = psycopg2.connect(**self.db_config)
            logger.info("Database connection established successfully")
            return True
        except psycopg2.Error as e:
            logger.error(f"Database connection failed: {e}")
            return False
    
    def close_connection(self):
        """Close database connection"""
        if self.connection:
            self.connection.close()
            logger.info("Database connection closed")
    
    def extract_medical_data(self) -> List[Dict[str, Any]]:
        """
        Extract extracted_data from Documents table for proposals where mc_required is True
        
        Returns:
            List of dictionaries containing structured medical data
        """
        if not self.connection:
            logger.error("No database connection available")
            return []
        
        query = """
        SELECT 
            d.id as document_id,
            d.proposal_number,
            d.member_id,
            d.proposer_id,
            d.document_type,
            d.source_url,
            d.extracted_data,
            d.validated,
            ret.request_id,
            ret.rule_status,
            ret.mc_required,
            ret.televideoagent_required,
            ret.finreview_required
        FROM Documents d
        INNER JOIN Rule_Engine_Trail ret ON d.proposal_number = ret.proposal_number
        WHERE ret.mc_required = TRUE
        AND d.extracted_data IS NOT NULL
        ORDER BY d.proposer_id, d.proposal_number, d.id;
        """
        
        try:
            cursor = self.connection.cursor()
            cursor.execute(query)
            results = cursor.fetchall()
            
            # Get column names
            column_names = [desc[0] for desc in cursor.description]
            
            structured_data = []
            
            for row in results:
                # Convert row to dictionary
                row_dict = dict(zip(column_names, row))
                
                # Parse extracted_data if it's JSON string
                try:
                    if row_dict['extracted_data']:
                        extracted_data = json.loads(row_dict['extracted_data'])
                    else:
                        extracted_data = {}
                except (json.JSONDecodeError, TypeError):
                    # If extracted_data is not valid JSON, keep as string
                    extracted_data = row_dict['extracted_data']
                
                # Structure the data
                structured_record = {
                    "document_info": {
                        "document_id": row_dict['document_id'],
                        "proposal_number": row_dict['proposal_number'],
                        "member_id": row_dict['member_id'],
                        "proposer_id": row_dict['proposer_id'],
                        "document_type": row_dict['document_type'],
                        "source_url": row_dict['source_url'],
                        "validated": row_dict['validated']
                    },
                    "rule_engine_info": {
                        "request_id": row_dict['request_id'],
                        "rule_status": row_dict['rule_status'],
                        "mc_required": row_dict['mc_required'],
                        "televideoagent_required": row_dict['televideoagent_required'],
                        "finreview_required": row_dict['finreview_required']
                    },
                    "extracted_data": extracted_data,
                    "extraction_metadata": {
                        "extracted_at": datetime.now().isoformat(),
                        "data_type": type(extracted_data).__name__
                    }
                }
                
                structured_data.append(structured_record)
            
            cursor.close()
            logger.info(f"Successfully extracted {len(structured_data)} records")
            return structured_data
            
        except psycopg2.Error as e:
            logger.error(f"Query execution failed: {e}")
            return []
    
    def group_data_by_proposer(self, data: List[Dict[str, Any]]) -> Dict[int, List[Dict[str, Any]]]:
        """
        Group data by proposer_id
        
        Args:
            data: List of structured data dictionaries
            
        Returns:
            Dictionary with proposer_id as key and list of records as value
        """
        grouped_data = {}
        
        for record in data:
            proposer_id = record['document_info']['proposer_id']
            
            if proposer_id not in grouped_data:
                grouped_data[proposer_id] = []
            
            grouped_data[proposer_id].append(record)
        
        return grouped_data
    
    def save_proposer_files(self, grouped_data: Dict[int, List[Dict[str, Any]]], base_dir: str = None) -> Dict[str, str]:
        """
        Save separate JSON files for each proposer_id in a subfolder
        
        Args:
            grouped_data: Dictionary with proposer_id as key and data as value
            base_dir: Base directory for output files
            
        Returns:
            Dictionary mapping proposer_id to file paths
        """
        if not base_dir:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            base_dir = f"extracted_data/proposer_data"
        
        # Create base directory if it doesn't exist
        os.makedirs(base_dir, exist_ok=True)
        
        file_paths = {}
        
        for proposer_id, proposer_data in grouped_data.items():
            # Create filename
            filename = f"proposer_{proposer_id}_data.json"
            filepath = os.path.join(base_dir, filename)
            
            # Create proposer summary
            proposer_summary = {
                "proposer_id": proposer_id,
                "total_documents": len(proposer_data),
                "unique_proposals": len(set([record['document_info']['proposal_number'] for record in proposer_data])),
                "document_types": list(set([record['document_info']['document_type'] for record in proposer_data])),
                "extraction_timestamp": datetime.now().isoformat()
            }
            
            # Structure the output
            output_data = {
                "proposer_summary": proposer_summary,
                "documents": proposer_data
            }
            
            try:
                with open(filepath, 'w', encoding='utf-8') as f:
                    json.dump(output_data, f, indent=2, ensure_ascii=False, default=str)
                
                file_paths[str(proposer_id)] = filepath
                logger.info(f"Data for proposer {proposer_id} saved to {filepath}")
                
            except Exception as e:
                logger.error(f"Failed to save data for proposer {proposer_id}: {e}")
        
        return file_paths
    
    def save_to_json_file(self, data: List[Dict[str, Any]], filename: str = None) -> str:
        """
        Save extracted data to JSON file (consolidated)
        
        Args:
            data: List of structured data dictionaries
            filename: Optional filename, if not provided uses timestamp
            
        Returns:
            str: Path to saved file
        """
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"medical_data_extract.json"
        
        # Create output directory if it doesn't exist
        output_dir = os.path.join(os.getcwd(), "extracted_data")
        os.makedirs(output_dir, exist_ok=True)
        
        filepath = os.path.join(output_dir, filename)
        
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False, default=str)
            
            logger.info(f"Consolidated data saved to {filepath}")
            return filepath
            
        except Exception as e:
            logger.error(f"Failed to save data to file: {e}")
            return ""
    
    def get_summary_statistics(self, data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Generate summary statistics for extracted data
        
        Args:
            data: List of structured data dictionaries
            
        Returns:
            Dictionary containing summary statistics
        """
        if not data:
            return {}
        
        # Count by document type
        document_types = {}
        rule_statuses = {}
        proposal_numbers = set()
        proposer_ids = set()
        validated_count = 0
        
        for record in data:
            doc_type = record['document_info']['document_type']
            rule_status = record['rule_engine_info']['rule_status']
            proposal_num = record['document_info']['proposal_number']
            proposer_id = record['document_info']['proposer_id']
            validated = record['document_info']['validated']
            
            document_types[doc_type] = document_types.get(doc_type, 0) + 1
            rule_statuses[rule_status] = rule_statuses.get(rule_status, 0) + 1
            proposal_numbers.add(proposal_num)
            proposer_ids.add(proposer_id)
            
            if validated:
                validated_count += 1
        
        summary = {
            "total_records": len(data),
            "unique_proposals": len(proposal_numbers),
            "unique_proposers": len(proposer_ids),
            "validated_documents": validated_count,
            "validation_percentage": round((validated_count / len(data)) * 100, 2),
            "document_types_distribution": document_types,
            "rule_status_distribution": rule_statuses,
            "extraction_timestamp": datetime.now().isoformat(),
            "database_info": {
                "host": self.db_config['host'],
                "database": self.db_config['database']
            }
        }
        
        return summary
    
    def get_proposer_summary_statistics(self, grouped_data: Dict[int, List[Dict[str, Any]]]) -> Dict[str, Any]:
        """
        Generate summary statistics for each proposer
        
        Args:
            grouped_data: Dictionary with proposer_id as key and data as value
            
        Returns:
            Dictionary containing per-proposer statistics
        """
        proposer_stats = {}
        
        for proposer_id, proposer_data in grouped_data.items():
            document_types = {}
            proposal_numbers = set()
            validated_count = 0
            
            for record in proposer_data:
                doc_type = record['document_info']['document_type']
                proposal_num = record['document_info']['proposal_number']
                validated = record['document_info']['validated']
                
                document_types[doc_type] = document_types.get(doc_type, 0) + 1
                proposal_numbers.add(proposal_num)
                
                if validated:
                    validated_count += 1
            
            proposer_stats[str(proposer_id)] = {
                "total_documents": len(proposer_data),
                "unique_proposals": len(proposal_numbers),
                "validated_documents": validated_count,
                "validation_percentage": round((validated_count / len(proposer_data)) * 100, 2),
                "document_types": document_types
            }
        
        return proposer_stats
    
    def filter_by_document_type(self, data: List[Dict[str, Any]], doc_type: str) -> List[Dict[str, Any]]:
        """
        Filter extracted data by document type
        
        Args:
            data: List of structured data dictionaries
            doc_type: Document type to filter by
            
        Returns:
            Filtered list of data dictionaries
        """
        return [record for record in data if record['document_info']['document_type'] == doc_type]
    
    def get_proposal_data(self, data: List[Dict[str, Any]], proposal_number: int) -> List[Dict[str, Any]]:
        """
        Get all documents for a specific proposal number
        
        Args:
            data: List of structured data dictionaries
            proposal_number: Proposal number to filter by
            
        Returns:
            List of documents for the specified proposal
        """
        return [record for record in data if record['document_info']['proposal_number'] == proposal_number]

def main():
    """Main execution function"""
    
    try:
        # Initialize extractor (loads config from .env)
        extractor = MedicalDataExtractor()
        
        # Connect to database
        if not extractor.connect_database():
            logger.error("Failed to connect to database. Exiting.")
            return
        
        # Extract medical data
        logger.info("Starting medical data extraction...")
        medical_data = extractor.extract_medical_data()
        
        if not medical_data:
            logger.warning("No data found for extraction")
            return
        
        # Group data by proposer_id
        logger.info("Grouping data by proposer_id...")
        grouped_data = extractor.group_data_by_proposer(medical_data)
        
        # Generate summary statistics
        summary = extractor.get_summary_statistics(medical_data)
        proposer_stats = extractor.get_proposer_summary_statistics(grouped_data)
        
        logger.info(f"Extraction Summary: {json.dumps(summary, indent=2)}")
        
        # Save individual proposer files
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        proposer_files = extractor.save_proposer_files(grouped_data)
        
        # Save consolidated file
        consolidated_file = extractor.save_to_json_file(medical_data)
        
        # Save summary files
        summary_dir = f"extracted_data/summary"
        os.makedirs(summary_dir, exist_ok=True)
        
        # Overall summary
        overall_summary_file = os.path.join(summary_dir, "overall_summary.json")
        with open(overall_summary_file, 'w', encoding='utf-8') as f:
            json.dump(summary, f, indent=2, ensure_ascii=False, default=str)
        logger.info(f"Overall summary saved to {overall_summary_file}")
        
        # Proposer-wise summary
        proposer_summary_file = os.path.join(summary_dir, "proposer_wise_summary.json")
        with open(proposer_summary_file, 'w', encoding='utf-8') as f:
            json.dump(proposer_stats, f, indent=2, ensure_ascii=False, default=str)
        logger.info(f"Proposer-wise summary saved to {proposer_summary_file}")
        
        # Create index file with all file paths
        index_data = {
            "extraction_info": {
                "timestamp": timestamp,
                "total_records": len(medical_data),
                "unique_proposers": len(grouped_data),
                "extraction_completed": datetime.now().isoformat()
            },
            "files": {
                "consolidated_data": consolidated_file,
                "overall_summary": overall_summary_file,
                "proposer_summary": proposer_summary_file,
                "proposer_files": proposer_files
            }
        }
        
        index_file = f"extracted_data/extraction_index.json"
        with open(index_file, 'w', encoding='utf-8') as f:
            json.dump(index_data, f, indent=2, ensure_ascii=False, default=str)
        logger.info(f"Index file saved to {index_file}")
        
        logger.info("Medical data extraction completed successfully")
        
        # Print comprehensive summary
        print(f"\n{'='*60}")
        print("EXTRACTION COMPLETE")
        print(f"{'='*60}")
        print(f"Total Records: {summary['total_records']}")
        print(f"Unique Proposals: {summary['unique_proposals']}")
        print(f"Unique Proposers: {summary['unique_proposers']}")
        print(f"Validated Documents: {summary['validated_documents']}")
        print(f"Validation Rate: {summary['validation_percentage']}%")
        print(f"\nFiles Created:")
        print(f"├── Consolidated Data: {consolidated_file}")
        print(f"├── Index File: {index_file}")
        print(f"├── Summary Files: {summary_dir}/")
        print(f"└── Proposer Files: {len(proposer_files)} individual files")
        
        print(f"\nProposer Breakdown:")
        for proposer_id, stats in proposer_stats.items():
            print(f"├── Proposer {proposer_id}: {stats['total_documents']} documents, {stats['unique_proposals']} proposals")
        
        print(f"{'='*60}\n")
        
    except ValueError as e:
        logger.error(f"Configuration error: {e}")
        print("\nPlease ensure your .env file contains the following variables:")
        print("DB_HOST=your_database_host")
        print("DB_NAME=your_database_name")
        print("DB_USER=your_database_user")
        print("DB_PASSWORD=your_database_password")
        print("DB_PORT=5432")
        
    except Exception as e:
        logger.error(f"Extraction process failed: {e}")
    
    finally:
        # Close database connection
        if 'extractor' in locals():
            extractor.close_connection()

# Example of how to use the class programmatically
def extract_and_process_data() -> Dict[str, Any]:
    """
    Convenience function to extract and process medical data
    
    Returns:
        Dictionary containing extracted data and summary
    """
    try:
        extractor = MedicalDataExtractor()
        
        if extractor.connect_database():
            data = extractor.extract_medical_data()
            grouped_data = extractor.group_data_by_proposer(data)
            summary = extractor.get_summary_statistics(data)
            proposer_stats = extractor.get_proposer_summary_statistics(grouped_data)
            
            # Save files
            proposer_files = extractor.save_proposer_files(grouped_data)
            consolidated_file = extractor.save_to_json_file(data)
            
            return {
                "success": True,
                "data": data,
                "grouped_data": grouped_data,
                "summary": summary,
                "proposer_stats": proposer_stats,
                "files": {
                    "consolidated": consolidated_file,
                    "proposer_files": proposer_files
                },
                "record_count": len(data)
            }
        else:
            return {
                "success": False,
                "error": "Database connection failed",
                "data": [],
                "summary": {}
            }
    
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "data": [],
            "summary": {}
        }
    
    finally:
        if 'extractor' in locals():
            extractor.close_connection()

if __name__ == "__main__":
    main()