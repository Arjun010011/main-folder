import React, { useState, useEffect } from "react";
import './Design.css';
import { getRequest, postRequest, putRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL, PUT_URL } from "Includes/urls";
import Swal from 'sweetalert2';
import sampleData from './sample_student_mark_data.json';
import FieldMapper from './FieldMapper';

const Toolbar = ({ pageSize, selectedSize, handleSelect, handleConfirmSize, handleReset, pageBg, setPageBg, selectColor, data, setData, droppedItems, setDroppedItems, onLoadTemplate, fieldSelectItem, setFieldSelectItem, apiConfig, setApiConfig }) => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [fieldMappings, setFieldMappings] = useState({});
  const [showFieldMapper, setShowFieldMapper] = useState(false);
  const [fieldMapperTarget, setFieldMapperTarget] = useState(null);

  // Watch for field select requests from Canvas
  useEffect(() => {
    if (fieldSelectItem) {
      openFieldMapper(fieldSelectItem);
      if (setFieldSelectItem) {
        setFieldSelectItem(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldSelectItem]);

  useEffect(() => {
    loadTemplates();
    // Automatically load sample data on mount
    if (!data) {
      loadSampleData();
    }
  }, []);

  const loadSampleData = () => {
    setData(sampleData);
    localStorage.setItem("data", JSON.stringify(sampleData));
    Swal.fire({
      title: 'Sample Data Loaded',
      text: 'Sample student mark data has been loaded. You can now design your template!',
      icon: 'info',
      timer: 3000,
      showConfirmButton: false
    });
  };

  const loadDefaultTemplate = () => {
    // Load sample data first
    setData(sampleData);
    localStorage.setItem("data", JSON.stringify(sampleData));
    
    // Create default template structure based on default_marks_card_2.html
    const defaultTemplateItems = [
      // Header - Institute Logo (Image placeholder)
      {
        type: 'Image',
        id: 'institute-logo',
        x: 10,
        y: 10,
        width: '80px',
        height: '80px',
        imageSrc: '',
        label: 'Institute Logo',
        value: 'institute_data.document_details.file'
      },
      // Header - Trust Name
      {
        type: 'ValueLabel',
        id: 'trust-name',
        x: 100,
        y: 10,
        width: '300px',
        height: '20px',
        value: 'institute_data.trust_name',
        fontSize: 15,
        fontWeight: 'normal',
        fontColor: '#000000',
        textAlign: 'center',
        label: ''
      },
      // Header - Institute Name
      {
        type: 'ValueLabel',
        id: 'institute-name',
        x: 100,
        y: 35,
        width: '300px',
        height: '35px',
        value: 'institute_data.name',
        fontSize: 30,
        fontWeight: 'bold',
        fontColor: '#000000',
        textAlign: 'center',
        label: ''
      },
      // Student Profile Picture
      {
        type: 'ValueImage',
        id: 'student-profile-pic',
        x: 420,
        y: 10,
        width: '100px',
        height: '100px',
        value: 'data.student_list.0.profile_pic_file',
        label: 'Student Photo'
      },
      // Student Name Label
      {
        type: 'Label',
        id: 'student-name-label',
        x: 10,
        y: 120,
        width: '150px',
        height: '25px',
        text: 'STUDENT NAME :',
        fontSize: 14,
        fontWeight: 'bold',
        fontColor: '#000000'
      },
      // Student Name Value
      {
        type: 'ValueLabel',
        id: 'student-name-value',
        x: 160,
        y: 120,
        width: '250px',
        height: '25px',
        value: 'data.student_list.0.student_name',
        fontSize: 14,
        fontWeight: 'bold',
        fontColor: '#000000',
        label: ''
      },
      // Class & Section Label
      {
        type: 'Label',
        id: 'class-section-label',
        x: 420,
        y: 120,
        width: '100px',
        height: '25px',
        text: 'CLASS & SEC :',
        fontSize: 14,
        fontWeight: 'bold',
        fontColor: '#000000'
      },
      // Class & Section Value
      {
        type: 'Text',
        id: 'class-section-value',
        x: 520,
        y: 120,
        width: '100px',
        height: '25px',
        text: '{{data.standard_name}} - {{data.section_name}}',
        fontSize: 14,
        fontWeight: 'bold',
        fontColor: '#000000'
      },
      // Father Name Label
      {
        type: 'Label',
        id: 'father-name-label',
        x: 10,
        y: 150,
        width: '150px',
        height: '25px',
        text: 'FATHER NAME :',
        fontSize: 14,
        fontWeight: 'bold',
        fontColor: '#000000'
      },
      // Father Name Value
      {
        type: 'ValueLabel',
        id: 'father-name-value',
        x: 160,
        y: 150,
        width: '250px',
        height: '25px',
        value: 'data.student_list.0.father_name',
        fontSize: 14,
        fontWeight: 'normal',
        fontColor: '#000000',
        label: ''
      },
      // Attendance Label
      {
        type: 'Label',
        id: 'attendance-label',
        x: 420,
        y: 150,
        width: '100px',
        height: '25px',
        text: 'ATTENDANCE :',
        fontSize: 14,
        fontWeight: 'bold',
        fontColor: '#000000'
      },
      // Attendance Value
      {
        type: 'Text',
        id: 'attendance-value',
        x: 520,
        y: 150,
        width: '100px',
        height: '25px',
        text: '{{data.student_list.0.marked_attendance_days}} / {{data.max_no_of_days_attendance}}',
        fontSize: 14,
        fontWeight: 'normal',
        fontColor: '#000000'
      },
      // Exam Details Title
      {
        type: 'Text',
        id: 'exam-details-title',
        x: 150,
        y: 190,
        width: '350px',
        height: '30px',
        text: '{{data.exam_details}}-({{data.academic_year_details.start_date}} - {{data.academic_year_details.end_date}})',
        fontSize: 21,
        fontWeight: 'bold',
        fontColor: '#000000',
        textAlign: 'center'
      },
      // Subject List Table
      {
        type: 'ValueTable',
        id: 'subject-list-table',
        x: 10,
        y: 240,
        width: '610px',
        height: '350px',
        value: 'data.student_list.0.subject_list_data',
        row: 10,
        column: 6,
        traverse: true,
        headers: ['SUBJECTS', 'ACTIVITY', 'WRITTEN', 'TOTAL', 'GRADE', 'PERCENTAGE'],
        thbackgroundcolor: '#ffffff',
        tbbackgroundcolor: '#ffffff',
        thfontsize: 13,
        tbfontsize: 13,
        bordercolor: '#000000',
        minheight: '30px'
      },
      // Remarks Label
      {
        type: 'Label',
        id: 'remarks-label',
        x: 10,
        y: 600,
        width: '100px',
        height: '25px',
        text: 'REMARKS :',
        fontSize: 14,
        fontWeight: 'bold',
        fontColor: '#000000'
      },
      // Remarks Value
      {
        type: 'ValueLabel',
        id: 'remarks-value',
        x: 110,
        y: 600,
        width: '400px',
        height: '25px',
        value: 'data.student_list.0.remark_name',
        fontSize: 14,
        fontWeight: 'bold',
        fontColor: '#000000',
        label: ''
      },
      // Class Teacher Signature
      {
        type: 'Label',
        id: 'teacher-signature',
        x: 20,
        y: 650,
        width: '150px',
        height: '50px',
        text: "Signature of the\nclass Teacher",
        fontSize: 14,
        fontWeight: 'normal',
        fontColor: '#000000',
        textAlign: 'left'
      },
      // Principal Signature
      {
        type: 'Label',
        id: 'principal-signature',
        x: 240,
        y: 650,
        width: '150px',
        height: '50px',
        text: "Signature of the\nPrincipal",
        fontSize: 14,
        fontWeight: 'normal',
        fontColor: '#000000',
        textAlign: 'center'
      },
      // Parent Signature
      {
        type: 'Label',
        id: 'parent-signature',
        x: 460,
        y: 650,
        width: '150px',
        height: '50px',
        text: "Signature of the\nParent/Guardian",
        fontSize: 14,
        fontWeight: 'normal',
        fontColor: '#000000',
        textAlign: 'right'
      }
    ];

    // Set page background first
    if (setPageBg) {
      setPageBg('#ffffff');
      localStorage.setItem("pageColor", '#ffffff');
    }
    
    // Set dropped items
    setDroppedItems(defaultTemplateItems);
    localStorage.setItem("droppedItems", JSON.stringify(defaultTemplateItems));
    
    // Call onLoadTemplate to set page size and trigger page view
    // Use setTimeout to ensure state updates happen in correct order
    setTimeout(() => {
      if (onLoadTemplate) {
        onLoadTemplate({
          template_data: {
            pageSize: 'A5',
            pageWidth: 148,
            pageHeight: 210,
            pageBg: '#ffffff',
            droppedItems: defaultTemplateItems
          }
        });
      }
    }, 100);

    Swal.fire({
      title: 'Default Template Loaded',
      html: 'Default marks card template structure has been loaded with all elements.<br/>You can now customize the design and map dynamic fields using "Select Data Field" option!',
      icon: 'success',
      timer: 3000,
      showConfirmButton: true
    });
  };

  const loadTemplates = async () => {
    try {
      const response = await getRequest(GET_URL.customdesigntemplate.api, { module: 'marks_card' });
      if (response && response.data) {
        setTemplates(response.data);
      }
    } catch (error) {
      console.error("Error loading templates:", error);
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];

    if (file) {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const jsonData = JSON.parse(e.target.result);
          setData(jsonData);
        } catch (error) {
          console.error("Invalid JSON file:", error);
          Swal.fire('Error', 'Invalid JSON file', 'error');
        }
      };

      reader.readAsText(file);
    }
  };

  const handleFieldMapping = (fieldName, jsonPath) => {
    setFieldMappings(prev => ({
      ...prev,
      [fieldName]: jsonPath
    }));
  };

  const handleFieldSelect = (path) => {
    if (fieldMapperTarget) {
      // Update the specific item's value
      const updatedItems = droppedItems.map(item => 
        item.id === fieldMapperTarget.id 
          ? { ...item, value: path }
          : item
      );
      setDroppedItems(updatedItems);
      localStorage.setItem("droppedItems", JSON.stringify(updatedItems));
      setFieldMapperTarget(null);
      Swal.fire('Success', `Field mapped to: ${path}`, 'success');
    } else {
      // Add to field mappings
      const fieldName = prompt('Enter a name for this field mapping:');
      if (fieldName) {
        setFieldMappings(prev => ({
          ...prev,
          [fieldName]: path
        }));
        Swal.fire('Success', `Field mapping "${fieldName}" saved`, 'success');
      }
    }
    setShowFieldMapper(false);
  };

  const openFieldMapper = (item = null) => {
    if (!data) {
      Swal.fire('Error', 'Please load sample data first', 'error');
      return;
    }
    setFieldMapperTarget(item);
    setShowFieldMapper(true);
  };

  const showFieldMappingDialog = () => {
    Swal.fire({
      title: 'Field Mapping',
      html: `
        <div style="text-align: left; max-height: 400px; overflow-y: auto;">
          <p><strong>Map template fields to JSON paths:</strong></p>
          <p style="font-size: 12px; color: #666;">
            Use dot notation to access nested values. Example: <code>data.student_list.0.student_name</code>
          </p>
          <div id="field-mapping-container" style="margin-top: 15px;">
            ${Object.keys(fieldMappings).map(field => `
              <div style="margin-bottom: 10px; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                <label style="display: block; margin-bottom: 5px; font-weight: bold;">${field}:</label>
                <input 
                  type="text" 
                  id="field-${field}" 
                  value="${fieldMappings[field]}" 
                  style="width: 100%; padding: 5px; border: 1px solid #ccc; border-radius: 3px;"
                  placeholder="e.g., data.student_list.0.student_name"
                />
              </div>
            `).join('')}
            <div style="margin-top: 15px;">
              <input 
                type="text" 
                id="new-field-name" 
                placeholder="New field name"
                style="width: 48%; padding: 5px; margin-right: 2%; border: 1px solid #ccc; border-radius: 3px;"
              />
              <input 
                type="text" 
                id="new-field-path" 
                placeholder="JSON path (e.g., data.student_list.0.student_name)"
                style="width: 48%; padding: 5px; border: 1px solid #ccc; border-radius: 3px;"
              />
            </div>
          </div>
        </div>
      `,
      width: '600px',
      showCancelButton: true,
      confirmButtonText: 'Save Mappings',
      preConfirm: () => {
        const mappings = {};
        Object.keys(fieldMappings).forEach(field => {
          const input = document.getElementById(`field-${field}`);
          if (input && input.value) {
            mappings[field] = input.value;
          }
        });
        const newFieldName = document.getElementById('new-field-name')?.value;
        const newFieldPath = document.getElementById('new-field-path')?.value;
        if (newFieldName && newFieldPath) {
          mappings[newFieldName] = newFieldPath;
        }
        return mappings;
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        setFieldMappings(result.value);
        Swal.fire('Success', 'Field mappings saved', 'success');
      }
    });
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      Swal.fire('Error', 'Please enter a template name', 'error');
      return;
    }

    if (!data) {
      Swal.fire('Error', 'Please load student mark data first', 'error');
      return;
    }

    setLoading(true);
    try {
      const templateData = {
        name: templateName,
        description: templateDescription,
        template_data: {
          droppedItems: droppedItems,
          pageSize: selectedSize,
          pageBg: pageBg,
          pageWidth: null, // Will be set when confirming size
          pageHeight: null,
          fieldMappings: fieldMappings // Store field mappings
        },
        sample_data: data,
        module: 'marks_card',
        template_type: 'pdf',
        api_config: apiConfig || null // Store API configuration
      };

      let response;
      if (selectedTemplate) {
        // Update existing template
        response = await putRequest(PUT_URL.customdesigntemplate.api, selectedTemplate.id, templateData);
      } else {
        // Create new template
        response = await postRequest(POST_URL.customdesigntemplate.api, templateData);
      }

      if (response && response.data) {
        Swal.fire('Success', selectedTemplate ? 'Template updated successfully' : 'Template saved successfully', 'success');
        setTemplateName("");
        setTemplateDescription("");
        setSelectedTemplate(null);
        loadTemplates();
      }
    } catch (error) {
      console.error("Error saving template:", error);
      Swal.fire('Error', 'Failed to save template', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadTemplate = async (template) => {
    try {
      setSelectedTemplate(template);
      setTemplateName(template.name);
      setTemplateDescription(template.description || "");
      
      if (template.template_data) {
        if (template.template_data.droppedItems) {
          setDroppedItems(template.template_data.droppedItems);
          localStorage.setItem("droppedItems", JSON.stringify(template.template_data.droppedItems));
        }
        if (template.template_data.pageSize) {
          handleSelect({ target: { value: template.template_data.pageSize } });
        }
        if (template.template_data.pageBg) {
          setPageBg(template.template_data.pageBg);
          localStorage.setItem("pageColor", template.template_data.pageBg);
        }
      }
      
      if (template.sample_data) {
        setData(template.sample_data);
        localStorage.setItem("data", JSON.stringify(template.sample_data));
      }

      // Load API config if available
      if (template.api_config && setApiConfig) {
        setApiConfig(template.api_config);
      }

      if (onLoadTemplate) {
        onLoadTemplate(template);
      }

      Swal.fire('Success', 'Template loaded successfully', 'success');
    } catch (error) {
      console.error("Error loading template:", error);
      Swal.fire('Error', 'Failed to load template', 'error');
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'This will delete the template',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        const { deleteRequest } = await import("Includes/api/apicall");
        const { DEL_URL } = await import("Includes/urls");
        const response = await deleteRequest(DEL_URL.customdesigntemplate.api, templateId);
        
        if (response) {
          Swal.fire('Deleted!', 'Template has been deleted', 'success');
          loadTemplates();
        }
      } catch (error) {
        console.error("Error deleting template:", error);
        Swal.fire('Error', 'Failed to delete template', 'error');
      }
    }
  };

  return (
    <div id="pageSizeInput" style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '5px', marginBottom: '20px' }}>
      <h3>Custom Design Template</h3>
      
      {/* Template Management */}
      <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
        <h4>Template Management</h4>
        <select 
          onChange={(e) => {
            const template = templates.find(t => t.id === parseInt(e.target.value));
            if (template) handleLoadTemplate(template);
            else setSelectedTemplate(null);
          }}
          value={selectedTemplate?.id || ""}
          style={{ width: '100%', marginBottom: '10px', padding: '5px' }}
        >
          <option value="">Select a template to load...</option>
          {templates.map(template => (
            <option key={template.id} value={template.id}>
              {template.name} {template.description ? `- ${template.description}` : ''}
            </option>
          ))}
        </select>
        
        {selectedTemplate && (
          <button 
            onClick={() => handleDeleteTemplate(selectedTemplate.id)}
            style={{ backgroundColor: 'red', color: 'white', padding: '5px 10px', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
          >
            Delete Template
          </button>
        )}
      </div>

      {/* Data Source */}
      <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
        <h4>Sample Data & Templates</h4>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
          <button 
            onClick={loadSampleData}
            style={{ backgroundColor: '#28a745', color: 'white', padding: '8px 15px', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
          >
            Load Sample Data
          </button>
          <button 
            onClick={loadDefaultTemplate}
            style={{ backgroundColor: '#007bff', color: 'white', padding: '8px 15px', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
          >
            Load Default Template
          </button>
          <input 
            type="file" 
            onChange={handleFileChange} 
            accept=".json"
            style={{ padding: '5px' }}
          />
        </div>
        <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
          {data ? '✓ Sample data loaded - Design your template below' : 'No data loaded - Click "Load Sample Data"'}
        </p>
        <p style={{ fontSize: '11px', color: '#888', marginTop: '5px', fontStyle: 'italic' }}>
          <strong>Quick Start:</strong> Click "Load Default Template" to start with a pre-configured marks card template. You can then customize the design and map dynamic fields using "Select Data Field" option from the context menu (right-click on any element).
        </p>
      </div>

      {/* Field Mapping */}
      <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#fff3cd', borderRadius: '5px', border: '1px solid #ffc107' }}>
        <h4>Field Mapping</h4>
        <p style={{ fontSize: '12px', color: '#856404', marginBottom: '10px' }}>
          Map template fields to JSON paths. This helps the system know where to fetch data from.
        </p>
        <button 
          onClick={showFieldMappingDialog}
          style={{ backgroundColor: '#ffc107', color: '#000', padding: '8px 15px', border: 'none', borderRadius: '3px', cursor: 'pointer', width: '100%' }}
        >
          Configure Field Mappings
        </button>
        {Object.keys(fieldMappings).length > 0 && (
          <div style={{ marginTop: '10px', fontSize: '11px', color: '#856404' }}>
            <strong>Mapped Fields ({Object.keys(fieldMappings).length}):</strong>
            <ul style={{ marginTop: '5px', paddingLeft: '20px' }}>
              {Object.entries(fieldMappings).map(([field, path]) => (
                <li key={field}><code>{field}</code> → <code>{path}</code></li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Page Settings */}
      <div style={{ marginBottom: '15px' }}>
        <h4>Page Settings</h4>
        <select onChange={handleSelect} value={selectedSize} style={{ width: '100%', padding: '5px', marginBottom: '10px' }}>
          <option value="" disabled>Select Page Size</option>
          {Object.keys(pageSize).map((key) => (
            <option key={key} value={key}>
              {key}: {pageSize[key][0]} x {pageSize[key][1]} mm
            </option>
          ))}
        </select>
        <label htmlFor="bgColor" style={{ display: 'block', marginBottom: '5px' }}>Background Color:</label>
        <input 
          type="color" 
          id="bgColor"
          onChange={selectColor} 
          value={pageBg || '#ffffff'}
          style={{ width: '100%', height: '40px', marginBottom: '10px' }}
        />
      </div>

      {/* Save Template */}
      <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#e8f5e9', borderRadius: '5px' }}>
        <h4>Save Template</h4>
        <input
          type="text"
          placeholder="Template Name *"
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          style={{ width: '100%', padding: '5px', marginBottom: '10px' }}
        />
        <textarea
          placeholder="Description (optional)"
          value={templateDescription}
          onChange={(e) => setTemplateDescription(e.target.value)}
          style={{ width: '100%', padding: '5px', marginBottom: '10px', minHeight: '60px' }}
        />
        <button 
          onClick={handleSaveTemplate}
          disabled={loading || !templateName.trim()}
          style={{ 
            backgroundColor: loading ? '#ccc' : 'green', 
            color: 'white', 
            padding: '8px 15px', 
            border: 'none', 
            borderRadius: '3px', 
            cursor: loading ? 'not-allowed' : 'pointer',
            width: '100%'
          }}
        >
          {loading ? 'Saving...' : selectedTemplate ? 'Update Template' : 'Save Template'}
        </button>
      </div>

      {/* Actions */}
      <div>
        <button 
          className="btn" 
          style={{backgroundColor:'purple', width: '48%', marginRight: '2%'}} 
          onClick={handleConfirmSize}
        >
          Confirm Size
        </button>
        <button 
          className="btn" 
          style={{backgroundColor:'red', width: '48%'}} 
          onClick={handleReset}
        >
          Reset
        </button>
      </div>

      {/* Field Mapper Modal */}
      {showFieldMapper && (
        <FieldMapper
          data={data}
          onFieldSelect={handleFieldSelect}
          onClose={() => {
            setShowFieldMapper(false);
            setFieldMapperTarget(null);
          }}
        />
      )}
    </div>
  );
};

export default Toolbar;
