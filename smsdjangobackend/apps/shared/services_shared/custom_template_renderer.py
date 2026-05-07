"""
Custom Template Renderer Service
Renders custom design templates with student mark data to HTML/PDF
"""
import json
from django.template.loader import render_to_string
from django.template import Context, Template
from apps.shared.models.custom_design_template import CustomDesignTemplate


def render_custom_template(template_obj, student_data, institute_data):
    """
    Render a custom design template with student mark data
    
    Args:
        template_obj: CustomDesignTemplate instance
        student_data: Student mark data dictionary (full response from API)
        institute_data: Institute data dictionary
    
    Returns:
        Rendered HTML string
    """
    if not template_obj or not template_obj.template_data:
        raise ValueError("Template or template data is missing")
    
    template_data = template_obj.template_data
    dropped_items = template_data.get('droppedItems', [])
    page_bg = template_data.get('pageBg', '#ffffff')
    page_width = template_data.get('pageWidth', 210)  # mm
    page_height = template_data.get('pageHeight', 297)  # mm
    field_mappings = template_data.get('fieldMappings', {})
    
    # Merge student_data and institute_data for easier access
    combined_data = {
        'data': student_data.get('data', student_data),
        'institute_data': institute_data
    }
    
    # Build HTML from dropped items
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            @page {{
                size: {page_width}mm {page_height}mm;
                margin: 0;
            }}
            body {{
                margin: 0;
                padding: 10mm;
                background-color: {page_bg};
                font-family: Arial, sans-serif;
                position: relative;
            }}
            .template-item {{
                position: absolute;
                box-sizing: border-box;
            }}
            .template-label {{
                font-weight: bold;
            }}
            .template-value {{
                word-wrap: break-word;
            }}
            .template-image {{
                max-width: 100%;
                height: auto;
            }}
            .template-table {{
                border-collapse: collapse;
                width: 100%;
            }}
            .template-table td, .template-table th {{
                border: 1px solid #000;
                padding: 5px;
            }}
        </style>
    </head>
    <body>
    """
    
    # Render each dropped item
    for item in dropped_items:
        item_html = render_template_item(item, combined_data, field_mappings)
        html_content += item_html
    
    html_content += """
    </body>
    </html>
    """
    
    return html_content


def render_template_item(item, combined_data, field_mappings):
    """
    Render a single template item (label, value, image, table, etc.)
    
    Args:
        item: Dictionary containing item properties (type, x, y, width, height, etc.)
        combined_data: Combined student and institute data dictionary
        field_mappings: Dictionary mapping field names to JSON paths
    
    Returns:
        HTML string for the item
    """
    item_type = item.get('type', '')
    x = item.get('x', 0)
    y = item.get('y', 0)
    width = item.get('width', '100px')
    height = item.get('height', '50px')
    
    # Convert pixel positions to mm (assuming 96 DPI: 1px ≈ 0.264583mm)
    x_mm = x * 0.264583
    y_mm = y * 0.264583
    
    style = f"position: absolute; left: {x_mm}mm; top: {y_mm}mm; width: {width}; height: {height};"
    
    content = ""
    
    if item_type == 'Label':
        label_text = item.get('label', '')
        content = f'<div class="template-label" style="{style}">{label_text}</div>'
    
    elif item_type == 'Value' or item_type == 'ValueLabel':
        # Check if there's a field mapping for this item
        value_path = item.get('value', '') or item.get('valuePath', '')
        
        # If value_path is a field name in mappings, use the mapped path
        if value_path in field_mappings:
            value_path = field_mappings[value_path]
        
        # Get value from combined data
        value = get_nested_value(combined_data, value_path) or ''
        content = f'<div class="template-value" style="{style}">{value}</div>'
    
    elif item_type == 'Image':
        image_src = item.get('imageSrc', '')
        if image_src:
            # Handle base64 images
            if image_src.startswith('data:image'):
                content = f'<img src="{image_src}" class="template-image" style="{style}" />'
            else:
                content = f'<img src="{image_src}" class="template-image" style="{style}" />'
    
    elif item_type == 'Table' or item_type == 'ValueTable':
        # Get table data path from item or field mappings
        table_path = item.get('value', '') or item.get('tableDataPath', '')
        
        # If table_path is a field name in mappings, use the mapped path
        if table_path in field_mappings:
            table_path = field_mappings[table_path]
        
        # Get table data from combined_data
        table_data = get_nested_value(combined_data, table_path)
        
        if not table_data:
            table_data = item.get('tableData', [])
        
        table_html = '<table class="template-table" style="width: 100%;">'
        if table_data and isinstance(table_data, list) and len(table_data) > 0:
            # If first item has headers, render them
            if isinstance(table_data[0], dict) and 'headers' in table_data[0]:
                table_html += '<thead><tr>'
                for header in table_data[0]['headers']:
                    table_html += f'<th>{header}</th>'
                table_html += '</tr></thead>'
                table_html += '<tbody>'
                for row in table_data:
                    if 'data' in row:
                        table_html += '<tr>'
                        for cell in row['data']:
                            cell_value = replace_placeholders(str(cell), combined_data)
                            table_html += f'<td>{cell_value}</td>'
                        table_html += '</tr>'
            else:
                # Render as simple array of objects
                table_html += '<tbody>'
                for row in table_data:
                    if isinstance(row, dict):
                        table_html += '<tr>'
                        for key, value in row.items():
                            cell_value = replace_placeholders(str(value), combined_data)
                            table_html += f'<td>{cell_value}</td>'
                        table_html += '</tr>'
            table_html += '</tbody>'
        table_html += '</table>'
        content = f'<div style="{style}">{table_html}</div>'
    
    elif item_type == 'Text':
        text_content = item.get('text', '')
        # Replace placeholders in text
        text_content = replace_placeholders(text_content, combined_data)
        content = f'<div style="{style}">{text_content}</div>'
    
    else:
        # Default: render as div
        content = f'<div style="{style}">{item_type}</div>'
    
    return content


def get_nested_value(data, path):
    """
    Get nested value from dictionary using dot notation path
    Example: 'data.student_list.0.student_name'
    """
    if not path or not data:
        return None
    
    try:
        keys = path.split('.')
        value = data
        for key in keys:
            # Handle array indices
            if key.isdigit():
                value = value[int(key)]
            else:
                value = value.get(key)
            if value is None:
                return None
        return value
    except (KeyError, IndexError, TypeError, AttributeError):
        return None


def replace_placeholders(text, combined_data):
    """
    Replace placeholders in text with actual data
    Example: {{data.student_list.0.student_name}} -> "John Doe"
    """
    import re
    
    # Find all placeholders like {{path.to.value}}
    pattern = r'\{\{([^}]+)\}\}'
    
    def replace_match(match):
        path = match.group(1).strip()
        value = get_nested_value(combined_data, path)
        return str(value) if value is not None else ''
    
    return re.sub(pattern, replace_match, text)


def get_custom_template_for_marks_card(exam_id, standard_section_id, academic_year_id=None, standard_id=None):
    """
    Get the appropriate custom template for marks card generation
    
    Args:
        exam_id: Exam ID
        standard_section_id: Standard Section ID
        academic_year_id: Academic Year ID (optional)
        standard_id: Standard ID (optional)
    
    Returns:
        CustomDesignTemplate instance or None
    """
    from apps.institutes.models.institute import Institute
    
    # Try to get institute (this might need to be passed as parameter)
    # For now, we'll filter without institute and let the viewset handle it
    queryset = CustomDesignTemplate.objects.filter(
        module='marks_card',
        is_active=True
    )
    
    # Filter by academic_year if provided
    if academic_year_id:
        queryset = queryset.filter(academic_year_id=academic_year_id)
    
    # Filter by standard if provided
    if standard_id:
        queryset = queryset.filter(standard_id=standard_id)
    
    # Return the first matching template, or None
    return queryset.first()

