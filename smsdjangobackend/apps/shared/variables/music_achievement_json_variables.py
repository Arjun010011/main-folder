music_achievement_letter = [
    {
        'template_type': 'pdf', 'module': 'music_achievement', 'name': 'default_music_achievement',
        'no_of_copies': 1
    },
    {
        'template_type': 'pdf', 'module': 'music_achievement', 'name': 'jaihind_music_achievement',
        'no_of_copies': 1
    }
]

music_achievement_json_variables = {
        "default": [
        ],
        "jaihind_music_achievement": [
           {
                "label_name": "Student",
                "validation_rules": "text",
                "name": "student_full_name",
            },
            {
                "label_name": "Competition",
                "validation_rules": "text",
                "name": "competition",
            },
             {
                "label_name": "Rank",
                "validation_rules": "text",
                "name": "rank",
            },
            {
                "label_name": "Event Date",
                "validation_rules": "text",
                "name": "event_date",
            },
            
            {
                "label_name": "Father Name",
                "validation_rules": "text",
                "name": "father_name",
            },
            {
                "label_name": "Standard Name",
                "validation_rules": "text",
                "name": "standard_name",
            },
            {
                "label_name": "From Academic Year",
                "validation_rules": "text",
                "name": "from_academic_year",
            },
        ],
    }    
