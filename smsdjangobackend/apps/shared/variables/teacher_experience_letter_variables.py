teacher_experience_letter = [
    {
        'template_type': 'pdf', 'module': 'teacher_experience_letter', 'name': 'teacher_experience_letter',
        'no_of_copies': 1
    },
    # {
    #     'template_type': 'pdf', 'module': 'teacher_appointment_letter', 'name': 'lr_cambridge_teacher_appointment_letter',
    #     'no_of_copies': 1
    # },
]
teacher_experience_letter_json_variables = {
        "default": [
            {
                "label_name": "Staff",
                "validation_rules": "text",
                "name": "staff_full_name",
            },
            {
                "label_name": "Position",
                "validation_rules": "text",
                "name": "position",
            },   
            {
                "label_name": "From Date",
                "validation_rules": "text",
                "name": "from_date",
            },
            {
                "label_name": "To Date",
                "validation_rules": "text",
                "name": "to_date",
            }            
            ],  
    }    