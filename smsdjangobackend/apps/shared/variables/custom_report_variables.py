custom_report_report=[
    {
        'template_type': 'pdf', 'module': 'custom_report', 'name': 'sssps_fee_pending',    
        'no_of_copies': 1
    },
    {
        'template_type': 'pdf', 'module': 'custom_report', 'name': 'ssps_cbs_fee_pending',
        'no_of_copies': 1
    },
    {
        'template_type':'pdf','module':'custom_report','name':'fee_pending_fee_type',
        'no_of_copies':1
    }
]
custom_report_json_variables ={
    "sssps_fee_pending": [
        {
            "label_name": "Terms",
            "validation_rules": "text",
            "name": "term",
        },
        {
            "label_name": "Date",
            "validation_rules": "text",
            "name": "date",
        },
        {
            "label_name": "Reason",
            "validation_rules": "text",
            "name": "reason",
        },
        {
            "label_name": "Note",
            "validation_rules": "text",
            "name": "note",
        },
    ],
    "ssps_cbs_fee_pending": [
        {
            "label_name": "Terms",
            "validation_rules": "text",
            "name": "term",
        },
        {
            "label_name": "Date",
            "validation_rules": "text",
            "name": "date",
        },
        {
            "label_name": "Reason",
            "validation_rules": "text",
            "name": "reason",
        },
        {
            "label_name": "Note",
            "validation_rules": "text",
            "name": "note",
        },
    ]
}
