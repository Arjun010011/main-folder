import { getRequest, postRequest } from 'Includes/api/apicall';
import { GET_URL } from 'Includes/urls';
import React, { useEffect, useState } from 'react';
import { getFlowTemplateData, serializeTemplateDataForBackend } from './layoutSchema';

const DesignPrint = () => {
    const [templates, setTemplates] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState(null);

    const getTemplate = async () => {
        try {
            const url = GET_URL.customdesigntemplate.api;
            const response = await getRequest(url);
            setTemplates(response.data || []);
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        getTemplate();
    }, []);

    const handlePrint = async () => {
        if (!selectedTemplate) {
            alert('Please select a template to print');
            return;
        }

        try {
            const url = GET_URL.customtemplateprint.api;

            const raw =
                typeof selectedTemplate.template_data === 'string'
                    ? JSON.parse(selectedTemplate.template_data)
                    : selectedTemplate.template_data;
            const flow = getFlowTemplateData(raw);
            let templateData = serializeTemplateDataForBackend(flow);
            if (templateData?.root?.children) {
                templateData = {
                    ...templateData,
                    root: {
                        ...templateData.root,
                        children: templateData.root.children.map((child) => {
                            if (child?.type === 'table') {
                                const th = child.th ?? child.tableCss?.th ?? {};
                                const tr = child.tr ?? child.tableCss?.tr ?? {};
                                const td = child.td ?? child.tableCss?.td ?? {};
                                return { ...child, th, tr, td };
                            }
                            if (child?.type === 'shape') {
                                return {
                                    ...child,
                                    shapeKind: child.shapeKind && ['rect', 'circle', 'ellipse', 'line'].includes(child.shapeKind) ? child.shapeKind : 'rect',
                                    backgroundColor: child.backgroundColor ?? 'transparent',
                                    borderColor: child.borderColor ?? '#000000',
                                    borderWidth: child.borderWidth != null ? child.borderWidth : 1,
                                    borderStyle: child.borderStyle ?? 'solid',
                                    borderRadius: child.borderRadius != null ? child.borderRadius : 0
                                };
                            }
                            if (child?.type === 'row' && Array.isArray(child.children)) {
                                return {
                                    ...child,
                                    flexDirection: child.flexDirection || 'row',
                                    gap: child.gap ?? 8,
                                    alignItems: child.alignItems || 'stretch',
                                    justifyContent: child.justifyContent || 'flex-start',
                                    children: child.children // Already serialized by serializeElement
                                };
                            }
                            return child;
                        }),
                    },
                };
            }
            const sampleData = selectedTemplate.sample_data != null
                ? JSON.parse(JSON.stringify(selectedTemplate.sample_data))
                : {};

            const payload = {
                template_data: templateData,
                sample_data: sampleData,
            };

            const response = await postRequest(
                url,
                payload,
                { responseType: 'blob' }
            );
            console.log(response)

            const file = new Blob([response.data], {
                type: 'application/pdf',
            });

            const fileURL = URL.createObjectURL(file);
            window.open(fileURL); // preview PDF

        } catch (error) {
            console.error('Print error:', error);
        }
    };


    return (
        <div>
            <h2>Design Print</h2>

            {templates.length > 0 ? (
                templates.map((item) => (
                    <div
                        key={item.id}
                        style={{
                            border: '1px solid #ccc',
                            marginBottom: 10,
                            padding: 10,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                        }}
                    >
                        <input
                            type="radio"
                            name="selectedTemplate"
                            checked={selectedTemplate?.id === item.id}
                            onChange={() => setSelectedTemplate(item)}
                        />

                        <div>
                            <p><strong>ID:</strong> {item.id}</p>
                            <p><strong>Name:</strong> {item.name}</p>
                            <p><strong>Description:</strong> {item.description}</p>
                        </div>
                    </div>
                ))
            ) : (
                <p>No data found</p>
            )}

            <button
                onClick={handlePrint}
                disabled={!selectedTemplate}
                style={{ marginTop: 10 }}
            >
                Print
            </button>
        </div>
    );
};

export default DesignPrint;
