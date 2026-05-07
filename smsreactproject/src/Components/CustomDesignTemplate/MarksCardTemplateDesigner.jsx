import React, { useState, useEffect, useRef } from 'react';
import { useHistory } from 'react-router-dom';
import Toolbar from './Toolbar';
import Canvas from './Canvas';
import './Design.css';
import { getRequest } from 'Includes/api/apicall';
import { GET_URL } from 'Includes/urls';
import Swal from 'sweetalert2';

const MarksCardTemplateDesigner = () => {
  const [pageWidth, setPageWidth] = useState("");
  const [pageHeight, setPageHeight] = useState("");
  const [pageView, setPageView] = useState(false);
  const [selectedSize, setSelectedSize] = useState("");
  const [droppedItems, setDroppedItems] = useState([]);
  const [data, setData] = useState(null);
  const [pageBg, setPageBg] = useState('#ffffff');
  const [fieldSelectItem, setFieldSelectItem] = useState(null);
  const [apiConfig, setApiConfig] = useState({
    exam: null,
    standard_section: null,
    student_ids: [],
    api_endpoint: 'studentmarkv2'
  });
  const [loading, setLoading] = useState(false);
  const divRef = useRef(null);
  const history = useHistory();

  const pageSize = {
    A4: [210, 297],
    A3: [297, 420],
    A5: [148, 210],
    Letter: [216, 279],
    Legal: [216, 356],
    Tabloid: [279, 432],
    Executive: [184, 267],
    Folio: [210, 330],
    Ledger: [432, 279],
  };

  useEffect(() => {
    // Prevent body scrolling when in full-screen mode
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  useEffect(() => {
    const handleEsc = (event) => {
      if (event.keyCode === 27) {
        handleClose();
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const handleClose = () => {
    if (history.length > 1) {
      history.goBack();
    } else {
      history.push('/dashboard');
    }
  };

  const handleSelect = (e) => {
    const size = e.target.value;
    setSelectedSize(size);
    if (pageSize[size]) {
      setPageWidth(pageSize[size][0]);
      setPageHeight(pageSize[size][1]);
      localStorage.setItem("pageSize", JSON.stringify(pageSize[size]));
    }
  };

  const handleConfirmSize = () => {
    if (selectedSize && pageSize[selectedSize]) {
      setPageView(true);
    } else {
      Swal.fire('Error', 'Please select a page size first', 'error');
    }
  };

  const handleReset = () => {
    setPageView(false);
    setPageWidth("");
    setPageHeight("");
    setSelectedSize("");
    setDroppedItems([]);
    localStorage.removeItem("pageSize");
    localStorage.removeItem("droppedItems");
    localStorage.removeItem("pageColor");
  };

  const selectColor = (color) => {
    setPageBg(color);
    localStorage.setItem("pageColor", color);
  };

  // Fetch sample data from studentmarkv2 API
  const fetchSampleData = async () => {
    if (!apiConfig.exam || !apiConfig.standard_section) {
      Swal.fire('Error', 'Please select Exam and Standard Section first', 'error');
      return;
    }

    setLoading(true);
    try {
      const params = {
        exam: apiConfig.exam,
        standard_section: apiConfig.standard_section,
      };

      if (apiConfig.student_ids && apiConfig.student_ids.length > 0) {
        params.student_ids = apiConfig.student_ids.join(',');
      }

      const response = await getRequest(GET_URL.studentmarkv2.api, params);
      
      if (response && response.data) {
        setData(response);
        localStorage.setItem("data", JSON.stringify(response));
        Swal.fire({
          title: 'Sample Data Loaded',
          text: 'Data from studentmarkv2 API has been loaded successfully!',
          icon: 'success',
          timer: 3000,
          showConfirmButton: false
        });
      } else {
        Swal.fire('Error', 'No data received from API', 'error');
      }
    } catch (error) {
      console.error("Error fetching sample data:", error);
      Swal.fire('Error', 'Failed to fetch sample data from API', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="custom-design-template-fullscreen">
      <div className="custom-design-template-header">
        <h2>Marks Card Template Designer (studentmarkv2 API)</h2>
        <button className="custom-design-template-close-btn" onClick={handleClose}>
          ✕ Close
        </button>
      </div>

      <div style={{ display: 'flex', height: 'calc(100vh - 60px)' }}>
        {/* API Configuration Panel */}
        <div style={{ 
          width: '300px', 
          backgroundColor: '#f5f5f5', 
          padding: '15px', 
          borderRight: '1px solid #ddd',
          overflowY: 'auto'
        }}>
          <h3 style={{ marginTop: 0 }}>API Configuration</h3>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              API Endpoint:
            </label>
            <select 
              value={apiConfig.api_endpoint}
              onChange={(e) => setApiConfig({ ...apiConfig, api_endpoint: e.target.value })}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            >
              <option value="studentmarkv2">studentmarkv2</option>
              <option value="studentmarkresultconfigv2">studentmarkresultconfigv2</option>
              <option value="studentmarkfinalresultconfigv2">studentmarkfinalresultconfigv2</option>
            </select>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Exam ID:
            </label>
            <input
              type="number"
              value={apiConfig.exam || ''}
              onChange={(e) => setApiConfig({ ...apiConfig, exam: e.target.value ? parseInt(e.target.value) : null })}
              placeholder="Enter Exam ID"
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Standard Section ID:
            </label>
            <input
              type="number"
              value={apiConfig.standard_section || ''}
              onChange={(e) => setApiConfig({ ...apiConfig, standard_section: e.target.value ? parseInt(e.target.value) : null })}
              placeholder="Enter Standard Section ID"
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Student IDs (comma-separated, optional):
            </label>
            <input
              type="text"
              value={apiConfig.student_ids.join(',')}
              onChange={(e) => {
                const ids = e.target.value.split(',').map(id => id.trim()).filter(id => id);
                setApiConfig({ ...apiConfig, student_ids: ids });
              }}
              placeholder="e.g., 1, 2, 3"
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </div>

          <button
            onClick={fetchSampleData}
            disabled={loading || !apiConfig.exam || !apiConfig.standard_section}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: loading ? '#ccc' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              marginBottom: '15px'
            }}
          >
            {loading ? 'Loading...' : 'Fetch Sample Data'}
          </button>

          {data && (
            <div style={{ 
              padding: '10px', 
              backgroundColor: '#d4edda', 
              borderRadius: '4px', 
              marginTop: '10px',
              fontSize: '12px'
            }}>
              <strong>✓ Data Loaded</strong>
              <div style={{ marginTop: '5px' }}>
                Students: {data.data?.student_list?.length || 0}
              </div>
              <div>
                Subjects: {data.data?.subject_list?.length || 0}
              </div>
            </div>
          )}

          <div style={{ 
            marginTop: '20px', 
            padding: '10px', 
            backgroundColor: '#fff3cd', 
            borderRadius: '4px',
            fontSize: '11px'
          }}>
            <strong>Note:</strong> After fetching sample data, you can design your template and map fields to API response keys. The API configuration will be saved with your template.
          </div>
        </div>

        {/* Main Design Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Toolbar
            pageSize={pageSize}
            selectedSize={selectedSize}
            handleSelect={handleSelect}
            handleConfirmSize={handleConfirmSize}
            handleReset={handleReset}
            selectColor={selectColor}
            pageBg={pageBg}
            setPageBg={setPageBg}
            data={data}
            setData={setData}
            droppedItems={droppedItems}
            setDroppedItems={setDroppedItems}
            setSelectedSize={setSelectedSize}
            setPageView={setPageView}
            setPageWidth={setPageWidth}
            setPageHeight={setPageHeight}
            fieldSelectItem={fieldSelectItem}
            setFieldSelectItem={setFieldSelectItem}
            apiConfig={apiConfig}
            setApiConfig={setApiConfig}
            onLoadTemplate={(template) => {
              if (template && template.template_data) {
                // Set page size first
                if (template.template_data.pageSize) {
                  const size = pageSize[template.template_data.pageSize];
                  if (size) {
                    setPageWidth(size[0]);
                    setPageHeight(size[1]);
                    setSelectedSize(template.template_data.pageSize);
                    setPageView(true);
                    localStorage.setItem("pageSize", JSON.stringify(size));
                  }
                } else if (template.template_data.pageWidth && template.template_data.pageHeight) {
                  setPageWidth(template.template_data.pageWidth);
                  setPageHeight(template.template_data.pageHeight);
                  setPageView(true);
                  localStorage.setItem("pageSize", JSON.stringify([template.template_data.pageWidth, template.template_data.pageHeight]));
                }
                
                // Set dropped items
                if (template.template_data.droppedItems && template.template_data.droppedItems.length > 0) {
                  setDroppedItems(template.template_data.droppedItems);
                  localStorage.setItem("droppedItems", JSON.stringify(template.template_data.droppedItems));
                }
                
                // Set page background
                if (template.template_data.pageBg) {
                  setPageBg(template.template_data.pageBg);
                  localStorage.setItem("pageColor", template.template_data.pageBg);
                }

                // API config is loaded by Toolbar component
              }
            }}
          />

          {pageView && pageWidth && pageHeight && (
            <Canvas
              pageWidth={pageWidth}
              pageHeight={pageHeight}
              droppedItems={droppedItems || []}
              setDroppedItems={setDroppedItems}
              divRef={divRef}
              pageBg={pageBg}
              data={data}
              onFieldSelect={(item) => {
                setFieldSelectItem(item);
              }}
            />
          )}
          {!pageView && (
            <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
              <p>Select a page size and click "Confirm Size" to start designing your template.</p>
              <p style={{ fontSize: '12px', marginTop: '10px' }}>
                First, configure the API parameters and fetch sample data from studentmarkv2 API.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MarksCardTemplateDesigner;

