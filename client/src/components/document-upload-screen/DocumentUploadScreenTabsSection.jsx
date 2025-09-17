import React from 'react';
import { useMediaQuery } from 'react-responsive';

const TabsSection = ({ activeTab, setActiveTab, tabs }) => {
  // Media query hooks for responsive design
  const isDesktop = useMediaQuery({ minWidth: 1024 });
  const isTablet = useMediaQuery({ minWidth: 768, maxWidth: 1023 });
  const isMobile = useMediaQuery({ maxWidth: 767 });

  // Desktop Layout
  if (isDesktop) {
    return (
      <div className="bg-transparent relative">
        <div className="flex space-x-8 px-6">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="relative py-4 px-2 font-medium text-base focus:outline-none transition-colors duration-200 text-gray-500 hover:text-blue-700"
              style={{
                color: activeTab === tab ? '#2563eb' : '',
                fontWeight: activeTab === tab ? 600 : 500
              }}
            >
              <span className="relative z-10">{tab}</span>
              {/* Blue underline for active tab */}
              {activeTab === tab && (
                <span
                  className="absolute left-0 right-0 mx-auto"
                  style={{
                    bottom: 0,
                    height: '3px',
                    width: '100%',
                    background: '#2563eb',
                    borderRadius: '2px',
                    transition: 'all 0.2s',
                    display: 'block'
                  }}
                ></span>
              )}
            </button>
          ))}
        </div>
        {/* Grey line across entire bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gray-300"></div>
      </div>
    );
  }

  // Tablet Layout
  if (isTablet) {
    return (
      <div className="bg-transparent relative">
        <div className="flex space-x-4 px-4 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="relative py-3 px-3 font-medium text-sm focus:outline-none transition-colors duration-200 text-gray-500 hover:text-blue-700 whitespace-nowrap"
              style={{
                color: activeTab === tab ? '#2563eb' : '',
                fontWeight: activeTab === tab ? 600 : 500
              }}
            >
              <span className="relative z-10">{tab}</span>
              {activeTab === tab && (
                <span
                  className="absolute left-0 right-0 mx-auto"
                  style={{
                    bottom: 0,
                    height: '2px',
                    width: '100%',
                    background: '#2563eb',
                    borderRadius: '1px',
                    transition: 'all 0.2s',
                    display: 'block'
                  }}
                ></span>
              )}
            </button>
          ))}
        </div>
        {/* Grey line across entire bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gray-300"></div>
      </div>
    );
  }

  // Mobile Layout
  return (
    <div className="bg-transparent relative">
      <div className="flex space-x-2 px-2 py-2 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-2 px-3 rounded-full font-medium text-xs whitespace-nowrap transition-colors duration-200 ${
              activeTab === tab
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {/* Abbreviated tab names for mobile */}
            {tab === 'Financial Review' ? 'Financial' :
             tab === 'Health Review' ? 'Health' : 
             tab === 'Health Review' ? 'Health' : tab}
          </button>
        ))}
      </div>
      {/* Grey line across entire bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gray-300"></div>
    </div>
  );
};

export default TabsSection;
