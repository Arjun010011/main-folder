// Predefined templates based on existing HTML templates
export const predefinedTemplates = {
  default_template: {
    name: 'Default Template',
    description: 'Simple and clean marks card template (A5 size)',
    pageSize: 'A5',
    pageBg: '#ffffff',
    elements: [
      {
        id: 1,
        type: 'image',
        x: 10,
        y: 10,
        width: 80,
        height: 80,
        dataPath: 'institute_data.document_details.file',
        text: ''
      },
      {
        id: 2,
        type: 'label',
        x: 100,
        y: 10,
        width: 300,
        height: 20,
        text: 'INSTITUTE NAME',
        fontSize: 15,
        color: '#000000'
      },
      {
        id: 3,
        type: 'value',
        x: 100,
        y: 35,
        width: 300,
        height: 35,
        dataPath: 'institute_data.name',
        fontSize: 30,
        color: '#000000'
      },
      {
        id: 4,
        type: 'image',
        x: 420,
        y: 10,
        width: 100,
        height: 100,
        dataPath: 'data.student_list.0.profile_pic_file',
        text: ''
      },
      {
        id: 5,
        type: 'label',
        x: 10,
        y: 120,
        width: 150,
        height: 25,
        text: 'STUDENT NAME :',
        fontSize: 14,
        color: '#000000'
      },
      {
        id: 6,
        type: 'value',
        x: 160,
        y: 120,
        width: 250,
        height: 25,
        dataPath: 'data.student_list.0.student_name',
        fontSize: 14,
        color: '#000000'
      },
      {
        id: 7,
        type: 'label',
        x: 420,
        y: 120,
        width: 100,
        height: 25,
        text: 'CLASS & SEC :',
        fontSize: 14,
        color: '#000000'
      },
      {
        id: 8,
        type: 'value',
        x: 520,
        y: 120,
        width: 100,
        height: 25,
        dataPath: 'data.standard_name',
        fontSize: 14,
        color: '#000000'
      },
      {
        id: 9,
        type: 'label',
        x: 10,
        y: 150,
        width: 150,
        height: 25,
        text: 'FATHER NAME :',
        fontSize: 14,
        color: '#000000'
      },
      {
        id: 10,
        type: 'value',
        x: 160,
        y: 150,
        width: 250,
        height: 25,
        dataPath: 'data.student_list.0.father_name',
        fontSize: 14,
        color: '#000000'
      },
      {
        id: 11,
        type: 'label',
        x: 150,
        y: 190,
        width: 350,
        height: 30,
        text: 'EXAM DETAILS',
        fontSize: 21,
        color: '#000000'
      },
      {
        id: 12,
        type: 'value',
        x: 150,
        y: 190,
        width: 350,
        height: 30,
        dataPath: 'data.exam_details',
        fontSize: 21,
        color: '#000000'
      },
      {
        id: 13,
        type: 'table',
        x: 10,
        y: 240,
        width: 610,
        height: 350,
        dataPath: 'data.student_list.0.subject_list_data',
        text: ''
      },
      {
        id: 14,
        type: 'label',
        x: 10,
        y: 600,
        width: 100,
        height: 25,
        text: 'REMARKS :',
        fontSize: 14,
        color: '#000000'
      },
      {
        id: 15,
        type: 'value',
        x: 110,
        y: 600,
        width: 400,
        height: 25,
        dataPath: 'data.student_list.0.remark_name',
        fontSize: 14,
        color: '#000000'
      }
    ]
  },
  nps_template: {
    name: 'NPS Template',
    description: 'NPS style with orange borders and yellow background',
    pageSize: 'A4',
    pageBg: '#FFD580',
    elements: [
      {
        id: 1,
        type: 'image',
        x: 50,
        y: 20,
        width: 100,
        height: 100,
        dataPath: 'institute_data.document_details.file',
        text: ''
      },
      {
        id: 2,
        type: 'label',
        x: 200,
        y: 30,
        width: 400,
        height: 40,
        text: 'NATIONAL PUBLIC SCHOOL',
        fontSize: 28,
        color: '#000080'
      },
      {
        id: 3,
        type: 'label',
        x: 200,
        y: 80,
        width: 400,
        height: 80,
        text: '(Affiliated to CBSE, New Delhi)\nBandappa Garden, JP Park, Bangalore',
        fontSize: 15,
        color: '#000080'
      },
      {
        id: 4,
        type: 'value',
        x: 200,
        y: 180,
        width: 400,
        height: 30,
        dataPath: 'data.exam_details',
        fontSize: 18,
        color: '#000080'
      },
      {
        id: 5,
        type: 'label',
        x: 50,
        y: 270,
        width: 150,
        height: 25,
        text: 'STUDENT NAME:',
        fontSize: 14,
        color: '#000080'
      },
      {
        id: 6,
        type: 'value',
        x: 200,
        y: 270,
        width: 300,
        height: 25,
        dataPath: 'data.student_list.0.student_name',
        fontSize: 14,
        color: '#000080'
      },
      {
        id: 7,
        type: 'label',
        x: 50,
        y: 300,
        width: 150,
        height: 25,
        text: "FATHER'S NAME:",
        fontSize: 14,
        color: '#000080'
      },
      {
        id: 8,
        type: 'value',
        x: 200,
        y: 300,
        width: 300,
        height: 25,
        dataPath: 'data.student_list.0.father_name',
        fontSize: 14,
        color: '#000080'
      },
      {
        id: 9,
        type: 'table',
        x: 50,
        y: 460,
        width: 650,
        height: 300,
        dataPath: 'data.student_list.0.subject_list_data',
        text: ''
      },
      {
        id: 10,
        type: 'label',
        x: 50,
        y: 1000,
        width: 300,
        height: 25,
        text: 'TOTAL MARKS IN WORDS:',
        fontSize: 14,
        color: '#000080'
      },
      {
        id: 11,
        type: 'value',
        x: 350,
        y: 1000,
        width: 200,
        height: 25,
        dataPath: 'data.student_list.0.total_summary.total_obtained_marks_in_word',
        fontSize: 14,
        color: '#000080'
      }
    ]
  },
  nandini_template: {
    name: 'Nandini Template',
    description: 'Template with background images and detailed layout',
    pageSize: 'A4',
    pageBg: '#ffffff',
    elements: [
      {
        id: 1,
        type: 'image',
        x: 630,
        y: 320,
        width: 150,
        height: 150,
        dataPath: 'data.student_list.0.profile_pic_file',
        text: ''
      },
      {
        id: 2,
        type: 'value',
        x: 630,
        y: 320,
        width: 200,
        height: 20,
        dataPath: 'data.student_list.0.student_name',
        fontSize: 18,
        color: '#4B0082'
      },
      {
        id: 3,
        type: 'label',
        x: 630,
        y: 350,
        width: 100,
        height: 20,
        text: 'Section :',
        fontSize: 14,
        color: '#000000'
      },
      {
        id: 4,
        type: 'value',
        x: 730,
        y: 350,
        width: 50,
        height: 20,
        dataPath: 'data.section_name',
        fontSize: 14,
        color: '#000000'
      },
      {
        id: 5,
        type: 'label',
        x: 630,
        y: 380,
        width: 100,
        height: 20,
        text: 'Class :',
        fontSize: 14,
        color: '#000000'
      },
      {
        id: 6,
        type: 'value',
        x: 730,
        y: 380,
        width: 50,
        height: 20,
        dataPath: 'data.standard_name',
        fontSize: 14,
        color: '#000000'
      },
      {
        id: 7,
        type: 'table',
        x: 30,
        y: 500,
        width: 550,
        height: 400,
        dataPath: 'data.student_list.0.subject_list_data',
        text: ''
      }
    ]
  },
  inps_template: {
    name: 'INPS Template',
    description: 'Simple layout with blue theme',
    pageSize: 'A4',
    pageBg: '#ffffff',
    elements: [
      {
        id: 1,
        type: 'image',
        x: 10,
        y: 10,
        width: 100,
        height: 100,
        dataPath: 'institute_data.document_details.file',
        text: ''
      },
      {
        id: 2,
        type: 'value',
        x: 120,
        y: 10,
        width: 400,
        height: 30,
        dataPath: 'institute_data.name',
        fontSize: 26,
        color: '#053DD8'
      },
      {
        id: 3,
        type: 'value',
        x: 120,
        y: 50,
        width: 400,
        height: 20,
        dataPath: 'institute_data.address',
        fontSize: 19,
        color: '#053DD8'
      },
      {
        id: 4,
        type: 'value',
        x: 200,
        y: 128,
        width: 300,
        height: 30,
        dataPath: 'data.exam_details',
        fontSize: 21,
        color: '#053DD8'
      },
      {
        id: 5,
        type: 'label',
        x: 10,
        y: 180,
        width: 200,
        height: 25,
        text: 'STUDENT NAME :',
        fontSize: 14,
        color: '#000000'
      },
      {
        id: 6,
        type: 'value',
        x: 210,
        y: 180,
        width: 300,
        height: 25,
        dataPath: 'data.student_list.0.student_name',
        fontSize: 14,
        color: '#000000'
      },
      {
        id: 7,
        type: 'label',
        x: 10,
        y: 220,
        width: 200,
        height: 25,
        text: 'STANDARD :',
        fontSize: 20,
        color: '#053DD8'
      },
      {
        id: 8,
        type: 'value',
        x: 210,
        y: 220,
        width: 100,
        height: 25,
        dataPath: 'data.standard_name',
        fontSize: 20,
        color: '#053DD8'
      },
      {
        id: 9,
        type: 'table',
        x: 10,
        y: 280,
        width: 700,
        height: 400,
        dataPath: 'data.student_list.0.subject_list_data',
        text: ''
      }
    ]
  },
  amardeep_template: {
    name: 'Amardeep Template',
    description: 'Blue theme with government recognition',
    pageSize: 'A4',
    pageBg: '#DBECF8',
    elements: [
      {
        id: 1,
        type: 'image',
        x: 10,
        y: 10,
        width: 100,
        height: 100,
        dataPath: 'institute_data.document_details.file',
        text: ''
      },
      {
        id: 2,
        type: 'value',
        x: 120,
        y: 10,
        width: 500,
        height: 30,
        dataPath: 'institute_data.name',
        fontSize: 25,
        color: '#0B6094'
      },
      {
        id: 3,
        type: 'label',
        x: 120,
        y: 45,
        width: 500,
        height: 20,
        text: '(Recognized by the Govt. of Karnataka)',
        fontSize: 14,
        color: '#0B6094'
      },
      {
        id: 4,
        type: 'value',
        x: 120,
        y: 70,
        width: 500,
        height: 20,
        dataPath: 'institute_data.address',
        fontSize: 14,
        color: '#0B6094'
      },
      {
        id: 5,
        type: 'label',
        x: 200,
        y: 100,
        width: 400,
        height: 30,
        text: 'STATEMENT OF MARKS',
        fontSize: 16,
        color: '#0B6094'
      },
      {
        id: 6,
        type: 'value',
        x: 200,
        y: 130,
        width: 400,
        height: 25,
        dataPath: 'data.exam_details',
        fontSize: 16,
        color: '#0B6094'
      },
      {
        id: 7,
        type: 'label',
        x: 10,
        y: 180,
        width: 150,
        height: 25,
        text: 'STUDENT NAME :',
        fontSize: 14,
        color: '#78AAC9'
      },
      {
        id: 8,
        type: 'value',
        x: 160,
        y: 180,
        width: 300,
        height: 25,
        dataPath: 'data.student_list.0.student_name',
        fontSize: 14,
        color: '#78AAC9'
      },
      {
        id: 9,
        type: 'table',
        x: 10,
        y: 250,
        width: 700,
        height: 500,
        dataPath: 'data.student_list.0.subject_list_data',
        text: ''
      }
    ]
  }
};

