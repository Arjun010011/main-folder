conduct_certificate = [{
        'template_type': 'pdf', 'module': 'conduct_certificate', 'name': 'default_conduct_certificate',
        'no_of_copies': 1
    },
]
conduct_certificate_json_variables = {
        "default_conduct_certificate": [
            {
                "label_name": "Today Date",
                "validation_rules": "text",
                "name": "today_date",
            },
            {
                "label_name": "Student",
                "validation_rules": "text",
                "name": "student_full_name",
            },
            {
                "label_name": "Father Name",
                "validation_rules": "text",
                "name": "father_name",
            },
            {
                "label_name": "Mother Name",
                "validation_rules": "text",
                "name": "mother_name",
            },
            {
                "label_name": "Standard Name",
                "validation_rules": "text",
                "name": "standard_name",
            },
            {
                "label_name": "Academic Year",
                "validation_rules": "text",
                "name": "academic_year",
            },
            {
                "label_name": " Conduct",
                "validation_rules": "text",
                "name": "conduct",
            },
        ]
}