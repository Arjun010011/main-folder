import React, { useState, useEffect } from 'react';
import './FieldMapper.css';

const FieldMapper = ({ data, onFieldSelect, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedPaths, setExpandedPaths] = useState({});
  const [selectedPath, setSelectedPath] = useState(null);

  const togglePath = (path) => {
    setExpandedPaths(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  const getValueType = (value) => {
    if (value === null || value === undefined) return 'null';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';
    return typeof value;
  };

  const renderValue = (value, path = '') => {
    const type = getValueType(value);
    
    if (type === 'object') {
      return (
        <div className="field-mapper-object">
          {Object.keys(value).map(key => {
            const newPath = path ? `${path}.${key}` : key;
            const isExpanded = expandedPaths[newPath];
            const childValue = value[key];
            const childType = getValueType(childValue);
            
            return (
              <div key={key} className="field-mapper-item">
                <div 
                  className="field-mapper-key"
                  onClick={() => {
                    if (childType === 'object' || childType === 'array') {
                      togglePath(newPath);
                    } else {
                      setSelectedPath(newPath);
                    }
                  }}
                >
                  <span className="field-mapper-expand">
                    {(childType === 'object' || childType === 'array') && (
                      <span>{isExpanded ? '▼' : '▶'}</span>
                    )}
                  </span>
                  <span className="field-mapper-key-name">{key}</span>
                  <span className="field-mapper-type">{childType}</span>
                  {childType === 'array' && (
                    <button
                      className="field-mapper-select-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onFieldSelect(newPath);
                      }}
                      style={{ backgroundColor: '#28a745' }}
                    >
                      Select Array
                    </button>
                  )}
                  {childType !== 'object' && childType !== 'array' && (
                    <button
                      className="field-mapper-select-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onFieldSelect(newPath);
                      }}
                    >
                      Select
                    </button>
                  )}
                </div>
                {isExpanded && (childType === 'object' || childType === 'array') && (
                  <div className="field-mapper-children">
                    {renderValue(childValue, newPath)}
                  </div>
                )}
                {childType !== 'object' && childType !== 'array' && (
                  <div className="field-mapper-preview">
                    Value: {String(childValue).substring(0, 50)}
                    {String(childValue).length > 50 && '...'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    } else if (type === 'array') {
      return (
        <div className="field-mapper-array">
          {value.map((item, index) => {
            const newPath = `${path}[${index}]`;
            const isExpanded = expandedPaths[newPath];
            const itemType = getValueType(item);
            
            return (
              <div key={index} className="field-mapper-item">
                <div 
                  className="field-mapper-key"
                  onClick={() => {
                    if (itemType === 'object' || itemType === 'array') {
                      togglePath(newPath);
                    } else {
                      setSelectedPath(newPath);
                    }
                  }}
                >
                  <span className="field-mapper-expand">
                    {(itemType === 'object' || itemType === 'array') && (
                      <span>{isExpanded ? '▼' : '▶'}</span>
                    )}
                  </span>
                  <span className="field-mapper-key-name">[{index}]</span>
                  <span className="field-mapper-type">{itemType}</span>
                  {itemType === 'array' && (
                    <button
                      className="field-mapper-select-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Get parent array path
                        const parentPath = path.split('[')[0];
                        onFieldSelect(parentPath);
                      }}
                      style={{ backgroundColor: '#28a745' }}
                    >
                      Select Array
                    </button>
                  )}
                  {itemType !== 'object' && itemType !== 'array' && (
                    <button
                      className="field-mapper-select-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onFieldSelect(newPath.replace('[', '.').replace(']', ''));
                      }}
                    >
                      Select
                    </button>
                  )}
                </div>
                {isExpanded && (itemType === 'object' || itemType === 'array') && (
                  <div className="field-mapper-children">
                    {renderValue(item, newPath.replace('[', '.').replace(']', ''))}
                  </div>
                )}
                {itemType !== 'object' && itemType !== 'array' && (
                  <div className="field-mapper-preview">
                    Value: {String(item).substring(0, 50)}
                    {String(item).length > 50 && '...'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    } else {
      return <span className="field-mapper-value">{String(value)}</span>;
    }
  };

  const filterData = (obj, searchTerm, path = '') => {
    if (!searchTerm) return true;
    const lowerSearch = searchTerm.toLowerCase();
    return Object.keys(obj).some(key => {
      const newPath = path ? `${path}.${key}` : key;
      const value = obj[key];
      return (
        key.toLowerCase().includes(lowerSearch) ||
        (typeof value === 'string' && value.toLowerCase().includes(lowerSearch)) ||
        (typeof value === 'object' && value !== null && filterData(value, searchTerm, newPath))
      );
    });
  };

  const filteredData = data && typeof data === 'object' ? data : {};

  return (
    <div className="field-mapper-overlay">
      <div className="field-mapper-modal">
        <div className="field-mapper-header">
          <h3>Select Data Field</h3>
          <button className="field-mapper-close" onClick={onClose}>✕</button>
        </div>
        <div className="field-mapper-search">
          <input
            type="text"
            placeholder="Search fields..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="field-mapper-search-input"
          />
        </div>
        <div className="field-mapper-content">
          {data ? (
            <div className="field-mapper-tree">
              {renderValue(data)}
            </div>
          ) : (
            <div className="field-mapper-empty">
              <p>No data available. Please load sample data first.</p>
            </div>
          )}
        </div>
        {selectedPath && (
          <div className="field-mapper-footer">
            <div className="field-mapper-selected">
              Selected: <code>{selectedPath}</code>
            </div>
            <button
              className="field-mapper-confirm-btn"
              onClick={() => {
                onFieldSelect(selectedPath);
                setSelectedPath(null);
              }}
            >
              Use This Field
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FieldMapper;


