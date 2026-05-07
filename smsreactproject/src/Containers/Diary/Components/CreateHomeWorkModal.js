/* eslint-disable react/display-name */
import React, {
  forwardRef,
  useImperativeHandle,
  useState,
  useRef,
} from "react";
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemSecondaryAction,
  ListItemText,
  Slide,
  TextField,
  Toolbar,
  Typography,
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Snackbar,
  CircularProgress,
  Paper,
} from "@material-ui/core";
import {
  ExpandMore,
  AddCircleOutlineOutlined,
  Close,
  PersonAddOutlined,
  Subject,
  AssignmentOutlined,
  EditTwoTone,
  CheckBoxOutlineBlank,
  CheckBox,
} from "@material-ui/icons";
import {
  MuiPickersUtilsProvider,
  KeyboardDatePicker,
} from "@material-ui/pickers";
import { FormattedMessage } from "react-intl";
import Autocomplete from "@material-ui/lab/Autocomplete";
import DateFnsUtils from "@date-io/date-fns";
import PropTypes from "prop-types";
import { cloneDeep } from "lodash";
import Swal from "sweetalert2";
import moment from "moment";

import { Alert, isUserHasPermission, dateFormat, getFullName } from "Includes/functions";
import { TEACHER_ID, maxFileSize, image_formats, support_docs_upload } from "Constants";
import { Dropdown } from "Components/DropDown";
import { getRequest, postRequest, putRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL, PUT_URL } from "Includes/urls";
import { numberRegex } from "Constants/regularExpression";
import commonMessages from "Constants/messages";
import "./../styles.scss";

let user = localStorage.getItem("user") != 'undefined' ? JSON.parse(localStorage.getItem("user")) : '';

const alias_names = JSON.parse(localStorage.getItem('alias_name')) ? JSON.parse(localStorage.getItem('alias_name')) : {}

const Transition = forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const lang_seq = {
  1: 'First Lang',
  2: 'Second Lang',
  3: 'Third Lang',
}

const icon = <CheckBoxOutlineBlank fontSize="small" />;
const checkedIcon = <CheckBox fontSize="small" />;

const CreateHomeWorkModal = forwardRef((props, ref) => {
  const defaultFieldValues = {
    title: "",
    description: "",
    points: "",
    duedate: moment().format("YYYY-MM-DD"),
    selected_standard: '',
    selected_sections: [],
    selected_subject: '',
  };
  const { standardList, getHomeWorkList } = props;
  const defaultFieldValuesRef = useRef(defaultFieldValues);
  const [subjectList, setsubjectList] = useState([]);
  const [teacherList, setteachersList] = useState([]);
  const [teacherListTemp, setteacherListTemp] = useState([]);
  const [subactiveDialog, setsubactiveDialog] = useState(false);
  const [openCreateHomeDialog, setopenCreateHomeDialog] = useState(false);
  const [sectiondropdownlist, setsectiondropdownlist] = useState([]);
  const [studentListMapping, setstudentListMapping] = useState({});
  const [sectionExpanded, setsectionExpanded] = useState(false);
  const [fieldValues, setfieldValues] = useState(defaultFieldValuesRef.current);
  const [enableUploadIcons, setenableUploadIcons] = useState(true);
  const [submitDisable, setsubmitDisable] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [activeImgData, setactiveImgData] = useState({});
  const [uploadedData, setuploadedData] = useState([]);
  const [fieldError, setfieldError] = useState({});

  const [snackBar, setsnackBar] = useState({
    openSnackbar: false,
    errorStatus: "",
    alertData: "",
  });

  // loaders state
  const [subjectListLoading, setsubjectListLoading] = useState(false);
  const [studentsLoading, setstudentsLoading] = useState(false);
  // Refs
  const alternateTeachersCount = useRef(0);
  const studentsCount = useRef(0);
  const studentListMappingRef = useRef({});
  const baseStudentsIdsRef = useRef({});
  const baseStdIdsRef = useRef({});
  const baseStaffDataRef = useRef({});
  const diaryDataRef = useRef({});
  const isEdit = useRef(false);
  const canCreateHomeWork = isUserHasPermission(
    "diary_managehomework",
    "create"
  );

  const isImage = (fileName) => {
    if (fileName) {
      let splittedDilePath = fileName.split(".");
      const extension = splittedDilePath[splittedDilePath.length - 1];
      return image_formats.type.includes(extension.toLowerCase());
    }
    return false;
  };

  useImperativeHandle(ref, () => ({
    editHomeWork(id) {
      setopenCreateHomeDialog(() => true);
      setLoadingData(() => true)
      let url = `${GET_URL.diary.api}${id}/`;
      let getHomeWork = {}
      getRequest(url, { from_diary: 1 }).then((response) => {
        if (response && response.status === 200) {
          getHomeWork = response.data.data;
          const data = {
            id: id,
            title: getHomeWork.title,
            description: getHomeWork.description,
            points: getHomeWork.marks,
            duedate: moment(getHomeWork.due_date).format("YYYY-MM-DD"),
            selected_standard: getHomeWork?.standard_details[0].standard,
            selected_sections: getHomeWork.standard_details.map((data) => {
              return {
                name: data.section_name,
                id: data.section,
                standard_section: data.standard_section,
              };
            }),
            selected_subject: getHomeWork.subject,
          };
          const studentIds = getHomeWork.student_details.map(
            (data) => data.student
          );
          const staffData = {};
          for (const data of getHomeWork.staff_details) {
            staffData[data.staff] = {
              view: data.view,
              update: data.update,
              evaluate: data.evaluate,
            };
          }
          updateEditData(
            data,
            studentIds,
            staffData,
            getHomeWork
          );
        }
      });
    },
    handleClickOpen() {
      setopenCreateHomeDialog(() => true);
      // resetFields();
      setfieldError({});
    },
  }));

  const updateEditData = (data, studentIds, staffData, diaryData) => {
    studentListMappingRef.current = {};
    isEdit.current = true;
    defaultFieldValuesRef.current = data;

    baseStudentsIdsRef.current = {};
    baseStaffDataRef.current = {};
    studentsCount.current = 0;
    // eslint-disable-next-line no-unused-vars
    for (const diaryStu of diaryData.student_details) {
      baseStudentsIdsRef.current[diaryStu.student] = diaryStu.id;
      if (
        !studentListMappingRef.current[
        diaryStu.standard_details.standard_section
        ]
      ) {
        studentListMappingRef.current[
          diaryStu.standard_details.standard_section
        ] = [];
      }
      studentsCount.current += 1;

      studentListMappingRef.current[
        diaryStu.standard_details.standard_section
      ].push({ ...diaryStu, diary_student_id: diaryStu.id, checked: true });

    }
    // eslint-disable-next-line no-unused-vars
    for (const diaryStu of diaryData.staff_details) {
      baseStaffDataRef.current[diaryStu.staff] = diaryStu;
    }
    // eslint-disable-next-line no-unused-vars
    for (const diaryStd of diaryData.standard_details) {
      baseStdIdsRef.current[diaryStd.standard_section] = diaryStd;
    }

    diaryDataRef.current = diaryData;
    const uploadedDataTemp = [];
    for (const doc of diaryData.document_details) {
      if (doc?.document_details?.file_name) {
        const data = {
          ...doc.document_details,
          name: doc.document_details.file_name,
          comment: doc.comment,
          diary_documnet_id: doc.id,
          isImage: isImage(doc.document_details.file_name),
        };
        uploadedDataTemp.push(data);
      }
    }

    setuploadedData(() => uploadedDataTemp);
    setsubactiveDialog(() => false);
    setLoadingData(() => false)
    // getSubjectList();
    let sectiondropdownlist = [
      {
        id: 8888888888,
        name: "All",
        standard_section: 8888888888,
        selected: true,
      },
    ];
    standardList.forEach((std) => {
      if (std.id === data.selected_standard) {
        sectiondropdownlist = [...sectiondropdownlist];
        // eslint-disable-next-line no-unused-vars
        for (const sec of std.sections) {
          sec.diary_standard_section_id = undefined;
          sec.selected = false;
          if (baseStdIdsRef.current[sec.standard_section]) {
            sec.diary_standard_section_id =
              baseStdIdsRef.current[sec.standard_section].id;
            sec.selected = true;
          } else {
            sectiondropdownlist[0].selected = false;
          }
          sectiondropdownlist.push(sec);
        }
      }
    });
    // eslint-disable-next-line no-unused-vars
    for (const field_section of defaultFieldValuesRef.current
      .selected_sections) {
      field_section.diary_standard_section_id = undefined;
      field_section.selected = false;
      if (baseStdIdsRef.current[field_section.standard_section]) {
        field_section.selected = true;
        field_section.diary_standard_section_id =
          baseStdIdsRef.current[field_section.standard_section].id;
      }
    }
    fetchTeacherList();
    setfieldValues(defaultFieldValuesRef.current);
    getSubjectList(data.selected_standard)
    setsectiondropdownlist(() => sectiondropdownlist);
  }

  const resetFields = () => {
    setsubactiveDialog(false);
    setteacherListTemp([]);
    setteachersList([]);
    setsectiondropdownlist([]);
    setstudentListMapping({});
    setsectionExpanded(false);
    setfieldValues(defaultFieldValues);
    setenableUploadIcons(true);
    setsubmitDisable(false);
    setactiveImgData({});
    setuploadedData([]);
    defaultFieldValuesRef.current = defaultFieldValues;
    alternateTeachersCount.current = 0;
    studentsCount.current = 0;
    studentListMappingRef.current = {};
    baseStudentsIdsRef.current = {};
    baseStdIdsRef.current = {};
    baseStaffDataRef.current = {};
    diaryDataRef.current = {};
    isEdit.current = false;
  };



  const handleClose = () => {
    getHomeWorkList();
    resetFields()
  };

  const fetchTeacherList = () => {
    const params = { group: TEACHER_ID };
    getRequest(GET_URL.staff.api, params).then((response) => {
      if (response && response.status === 200) {
        const response_data = response.data.data;
        alternateTeachersCount.current = 0;
        response_data.forEach((data, index) => {
          if (user['staff']['id'] == data['id']) {
            response_data.splice(index, 1)
          }
          data.view = false;
          data.update = false;
          data.evaluate = false;
          data.diary_staff_id = undefined;
          if (baseStaffDataRef.current[data.id]) {
            data.view = baseStaffDataRef.current[data.id].view;
            data.update = baseStaffDataRef.current[data.id].update;
            data.evaluate = baseStaffDataRef.current[data.id].evaluate;
            data.diary_staff_id = baseStaffDataRef.current[data.id].id;
            alternateTeachersCount.current += 1;
          }
        });
        setteacherListTemp(() => response_data);
        setteachersList(() => response_data);
      }
    });
  };

  const subDialogOpen = (type, index) => {
    if (type === "alternate_teacher") {
      if (teacherList.length > 0) {
        setsubactiveDialog(() => type);
        setteacherListTemp(() => teacherList);
        return;
      }
      fetchTeacherList();
      setsubactiveDialog(() => type);
    } else if (type === "student") {
      if (fieldValues.selected_sections.length === 0) {
        setsnackBar({
          openSnackbar: true,
          errorStatus: "Error",
          alertData: "Section not selected!!",
        });
        return;
      }
      setsubactiveDialog(() => type);
      if (fieldValues.selected_sections.length > 0) {
        const index = 0;
        const firstSection = fieldValues.selected_sections[index];
        if (
          Object.prototype.hasOwnProperty.call(
            studentListMapping,
            firstSection.standard_section
          )
        ) {
          const sectionExpandedTemp = `panel-${index}`;
          setsectionExpanded(() => sectionExpandedTemp);
        } else if (!studentListMapping[firstSection]) {
          getStudentList(firstSection.standard_section, firstSection.id, index);
        }
      }
    } else if (type === "img_comments") {
      const activeImgTemp = { ...uploadedData[index], index };
      setactiveImgData(activeImgTemp);
      setsubactiveDialog(type);
    }
  };

  const subDialogClose = (status) => {
    if (status === "alternate_teacher") {
      const teacherListDup = cloneDeep(teacherListTemp);
      let count = 0;
      teacherListDup.forEach((teacher) => {
        if (teacher.view || teacher.evaluate || teacher.update) {
          count += 1;
        }
      });
      alternateTeachersCount.current = count;
      setteachersList(() => teacherListDup);
    } else if (status === "alternate_teacher_cancel") {
      const teacherListDup = cloneDeep(teacherList);
      setteacherListTemp(() => teacherListDup);
    } else if (status === "student") {
      studentListMappingRef.current = studentListMapping;
      studentsCount.current = 0;
      for (const sectionStudentList of Object.values(
        studentListMappingRef.current
      )) {
        for (const secStudent of sectionStudentList) {
          if (secStudent.checked && secStudent.id !== 'all') {
            studentsCount.current += 1;
          }
        }
      }
    } else if (status === "student_cancel") {
      const studentListMappingTemp = studentListMappingRef.current;
      setstudentListMapping(() => studentListMappingTemp);
    } else if (status === "img_comments") {
      let uploadedDataTemp = uploadedData;
      uploadedDataTemp[activeImgData.index] = activeImgData;
      setactiveImgData(() => uploadedDataTemp);
    }
    setsubactiveDialog(() => false);
  };

  const updateTeacherStatus = (index, type) => {
    const teacherListDup = cloneDeep(teacherListTemp);
    teacherListDup[index][type] = !teacherListDup[index][type];
    setteacherListTemp(() => teacherListDup);
  };

  const getSectionIds = (sectionList) => {
    let temp_list = []
    sectionList.map((data) => {
      if (data['id'] !== 8888888888) {
        temp_list.push(data['id'])
      }
    })
    return temp_list.join()
  }

  const getSubjectList = (value, sectionList) => {
    const url = GET_URL.getAssignSubject.api;
    let params = { is_active: true, for_admission: 1, academic_year: user.other_details.academic_year.id, standard: value };
    if (sectionList) {
      params['section'] = getSectionIds(sectionList)
    }
    setsubjectListLoading(true);
    getRequest(url, params).then((response) => {
      setsubjectListLoading(false);
      if (response && response.status === 200) {
        const subjectList = response.data.data;
        subjectList.map((data) => {
          if (data.is_language) {
            data['name'] = data['name'] + ' ' + lang_seq[data.sequence]
          }
        })
        setsubjectList(() => subjectList);
      }
    });
  };

  const onChangeSection = (val) => {
    const fieldValuesTemp = cloneDeep(fieldValues);
    let curAllInd = -1;
    val.forEach((data, ind) => {
      if (data.name === "All") {
        curAllInd = ind;
      }
    });
    let prevInd = -1;
    fieldValuesTemp["selected_sections"].forEach((data, ind) => {
      if (data.name === "All") {
        prevInd = ind;
      }
    });
    if (prevInd !== -1 && curAllInd === -1) {
      fieldValuesTemp["selected_sections"] = [];
    } else if (
      (prevInd === -1 && curAllInd !== -1) ||
      (prevInd === -1 &&
        curAllInd === -1 &&
        val.length === sectiondropdownlist.length - 1)
    ) {
      const sectiondropdownlistTemp = sectiondropdownlist.map((data) => {
        data.selected = true;
        return data;
      });
      fieldValuesTemp["selected_sections"] = sectiondropdownlistTemp;
    } else if (curAllInd !== -1 && val.length !== sectiondropdownlist.length) {
      fieldValuesTemp["selected_sections"] = val.filter((data) => {
        data.selected = true;
        return data.name !== "All";
      });
    } else {
      fieldValuesTemp["selected_sections"] = val;
    }
    studentsCount.current = 0;
    setstudentListMapping({});
    setfieldValues(() => fieldValuesTemp);
    let fieldErrorTemp = { ...fieldError }
    delete fieldErrorTemp['selected_sections']
    getSubjectList(fieldValues.selected_standard, val)
    setfieldError(() => fieldErrorTemp)
  };

  const handleChangeInnerAccordion = (data, index) => () => {
    const sectionExpandedTemp =
      sectionExpanded === `panel-${index}` ? false : `panel-${index}`;
    if (
      sectionExpandedTemp === false ||
      Object.prototype.hasOwnProperty.call(
        studentListMapping,
        data.standard_section
      )
    ) {
      setsectionExpanded(() => sectionExpandedTemp);
    } else {
      getStudentList(data.standard_section, data.id, index);
    }
  };

  const handleChangeDoc = (event) => {
    setenableUploadIcons(() => false);
    let fileName = event.target.files[0]["name"];
    let file_extension = `${fileName.slice(
      (Math.max(0, fileName.lastIndexOf(".")) || Infinity) + 1
    )}`;
    let is_supported_types = true;
    is_supported_types = support_docs_upload.file_types.includes(
      file_extension.toLowerCase()
    );
    if (event.target.files[0] && is_supported_types) {
      if (event.target.files[0].size < maxFileSize['video'].size) {
        let post = new FormData();
        post.append("file", event.target.files[0]);
        const url = POST_URL.uploads.api;
        postRequest(url, post, props).then((response) => {
          if (response && response.status === 200) {
            const data = {
              comment: "",
              name: fileName,
              id: response.data.data.id,
              file: response.data.data.file,
              extension: file_extension.toLowerCase(),
              isImage: isImage(fileName),
            };
            const uploadDataTemp = [...uploadedData, data];
            setuploadedData(() => uploadDataTemp);
          }
        });
      } else {
        setsnackBar({
          openSnackbar: true,
          errorStatus: "Error",
          alertData: "Please Upload Below 100 MB",
        });
      }
    } else if (!is_supported_types) {
      setsnackBar({
        openSnackbar: true,
        errorStatus: "Error",
        alertData: support_docs_upload.error,
      });
    }
    setenableUploadIcons(() => true);
  };

  const removeDoc = (index) => {
    const uploadedDataTemp = [...uploadedData];
    uploadedDataTemp.splice(index, 1);
    setuploadedData(() => uploadedDataTemp);
  };

  const getStudentList = async (standard_section, sectionId, index) => {
    setstudentsLoading(() => true);
    setsectionExpanded(() => `panel-${index}`);
    const academicYearId = user.other_details.academic_year.id;
    let params = {
      academic_year: academicYearId,
      standard: fieldValues.selected_standard,
      section: sectionId,
    };
    if (fieldValues.selected_subject) {
      params['student_subject'] = fieldValues.selected_subject
    }
    let url = GET_URL.getenrolledstudents.api;
    const studentListMappingTemp = cloneDeep(studentListMapping);
    getRequest(url, params).then((response) => {
      setstudentsLoading(() => false);
      studentsCount.current = 0;
      if (response && response.status === 200) {
        if (response.data.data.length > 0)
          response.data.data.unshift({ id: 'all', name: 'All', checked: false })
        let sectionStudentList = response.data.data.map((student) => {
          student.checked = false;
          student.diary_student_id = undefined;
          student.name = student.id === 'all' ? student.name : getFullName(student.student_first_name, student.student_middle_name, student.student_last_name);
          if (baseStudentsIdsRef.current[student.student]) {
            student.checked = true;
            studentsCount.current += 1;
            student.diary_student_id =
              baseStudentsIdsRef.current[student.student];
          }
          return student;
        });
        if (response.data.data.length > 0) {
          sectionStudentList[0]['checked'] = studentsCount.current === response.data.data.length - 1
        }
        studentListMappingTemp[standard_section] = sectionStudentList;
        studentListMappingRef.current[standard_section] = sectionStudentList;
        setstudentListMapping(() => studentListMappingTemp);
      }
    });
  };

  const handleToggle = (standard_section, stuIndex, checked) => {
    if (stuIndex === 0) {
      const studentListMappingTemp = cloneDeep(studentListMapping);
      studentListMappingTemp[standard_section].map((data) => {
        data.checked = !checked
      })
      setstudentListMapping(() => studentListMappingTemp);
    }
    else {
      const studentListMappingTemp = cloneDeep(studentListMapping);
      studentListMappingTemp[standard_section][stuIndex].checked =
        !studentListMappingTemp[standard_section][stuIndex].checked;
      if (!studentListMappingTemp[standard_section][stuIndex].checked) {
        studentListMappingTemp[standard_section][0].checked = false
      }
      setstudentListMapping(() => studentListMappingTemp);
    };
  }

  const handleChange = (e, name) => {
    const fieldValuesTemp = cloneDeep(fieldValues);
    if (name === "duedate") {
      fieldValuesTemp[name] = moment(e).format("YYYY-MM-DD");
      let fieldErrorTemp = { ...fieldError }
      delete fieldErrorTemp[name]
      setfieldError(() => fieldErrorTemp)
      setfieldValues(() => fieldValuesTemp);
    } else {
      let { name, value } = e.target;
      if (name === "active_img_description") {
        const activeImgDataTemp = activeImgData;
        activeImgDataTemp.comment = value;
        setactiveImgData(() => activeImgDataTemp);
      } else {
        let fieldErrorTemp = { ...fieldError }
        delete fieldErrorTemp[name]
        setfieldError(() => fieldErrorTemp)
        fieldValuesTemp[name] = value;
        if (name === "points" && !numberRegex.value.test(value)) {
          fieldErrorTemp[name] = 'Invalid Points'
        }
        setfieldError(() => fieldErrorTemp)
      }
      setfieldValues(() => fieldValuesTemp);
    }
  };

  const onChangeStandard = (event) => {
    const { value } = event.target;
    let sectiondropdownlist = [
      {
        id: 8888888888,
        name: "All",
        standard_section: 8888888888,
      },
    ];
    studentListMappingRef.current = {};
    standardList.forEach((data) => {
      if (data.id === value) {
        sectiondropdownlist = [...sectiondropdownlist, ...data.sections];
      }
    });
    const fieldValuesTemp = cloneDeep(fieldValues);
    studentsCount.current = 0;
    fieldValuesTemp.selected_subject = '';
    fieldValuesTemp.selected_sections = [];
    fieldValuesTemp.selected_standard = value;
    setstudentListMapping({});
    setfieldValues(() => fieldValuesTemp);
    setsectiondropdownlist(() => sectiondropdownlist);
    let fieldErrorTemp = { ...fieldError }
    delete fieldErrorTemp['selected_standard']
    getSubjectList(value)
    setfieldError(() => fieldErrorTemp)
  };

  const handleCloseSnackBar = () => {
    setsnackBar({ openSnackbar: false, errorStatus: "", alertData: "" });
  };

  const saveHomeWork = () => {
    let section = [];
    let studentsList = [];
    const standardSecIds = [];
    const studentIds = [];

    fieldValues.selected_sections.forEach((selectedSec) => {
      if (
        selectedSec.name !== "All" &&
        studentListMappingRef.current?.[selectedSec?.standard_section]
      ) {
        // eslint-disable-next-line no-unused-vars
        for (const stu of studentListMappingRef.current[
          selectedSec.standard_section
        ]) {
          if (stu.checked && stu.student) {
            if (stu.diary_student_id) {
              studentIds.push(stu.diary_student_id);
            }
            studentsList.push({
              student: stu.student,
              id: stu.diary_student_id,
            });
            standardSecIds.push(selectedSec.standard_section);
          }
        }
        if (studentsList.length !== 0) {
          section.push({
            standard_section: selectedSec.standard_section,
            id: selectedSec.diary_standard_section_id,
          });
        }
      }
    });
    let sectionResponseIds = []
    diaryDataRef.current.standard_details && diaryDataRef.current.standard_details.forEach((stdData) => {
      if (standardSecIds.includes(stdData['standard_section']) && stdData['id']) {
        sectionResponseIds.push(stdData['id'])
      }
    })
    const staffDetails = [];
    const staffIds = [];
    teacherList.forEach((data) => {
      if (data.view || data.update || data.evaluate) {
        if (data.id) {
          staffIds.push(data.id);
        }
        staffDetails.push({
          view: data.view,
          update: data.update,
          evaluate: data.evaluate,
          staff: data.id,
          id: data.diary_staff_id,
        });
      }
    });

    const documentIds = [];
    const documentDetails = uploadedData.map((data) => {
      if (data.diary_documnet_id) {
        documentIds.push(data.diary_documnet_id);
      }
      return {
        document: data.id,
        comment: data.comment,
        id: data.diary_documnet_id,
      };
    });
    let date = new Date(fieldValues.duedate);
    date = moment(date).format("YYYY-MM-DD");
    let postData = {
      title: fieldValues.title,
      description: fieldValues.description,
      marks: fieldValues.points ? fieldValues.points : null,
      due_date: date,
      standard_details: section,
      staff_details: staffDetails,
      student_details: studentsList,
      subject: fieldValues.selected_subject,
      document_details: documentDetails,
    };

    if (!isEdit.current) {
      postData.deleted_standard_details = [];
      postData.deleted_staff_details = [];
      postData.deleted_document_details = [];
      postData.deleted_student_details = [];
      let url = POST_URL.diary.api;
      const test = validatePayload(postData);
      if (test === "") {
        setsubmitDisable(() => true);
        postRequest(url, postData)
          .then((response) => {
            if (response && response.status === 200) {
              handleClose();

              Swal.fire({
                position: "top-end",
                type: "success",
                title: response.data.Reason,
                showConfirmButton: false,
                timer: 1500,
              });
            }
            setsubmitDisable(() => false);
          })
      }
    } else {
      postData.deleted_standard_details = makeDeletableIds(
        diaryDataRef.current.standard_details,
        sectionResponseIds,
        "id"
      );
      postData.deleted_staff_details = makeDeletableIds(
        diaryDataRef.current.staff_details,
        staffIds,
        "staff"
      );
      postData.deleted_document_details = makeDeletableIds(
        diaryDataRef.current.document_details,
        documentIds,
        "id"
      );
      postData.deleted_student_details = makeDeletableIds(
        diaryDataRef.current.student_details,
        studentIds,
        "id"
      );
      postData = { ...postData, diaryId: diaryDataRef.current.id };
      const url = `${PUT_URL.diary.api}${diaryDataRef.current.id}/`;
      const test = validatePayload(postData);
      if (test === "") {
        setsubmitDisable(() => true);
        putRequest(url, postData)
          .then((response) => {
            if (response && response.status === 200) {
              Swal.fire({
                position: "top-end",
                type: "success",
                title: response.data.Reason,
                showConfirmButton: false,
                timer: 1500,
              });
              // getHomeWorkList();
              handleClose();
            }
            setsubmitDisable(() => false);
            // studentListMappingRef.current = {};
          })
      }
    }
  };



  const validatePayload = (payload) => {
    let errorMessage = "";
    let fieldError = {}
    if (payload.title === "") {
      fieldError['title'] = <FormattedMessage {...commonMessages.fieldMandatoryError} />
      errorMessage = "Title not found!!";
    } if (isNaN(payload.marks)) {
      errorMessage = "Enter valid marks";
    } if (!payload.due_date) {
      fieldError['due_date'] = <FormattedMessage {...commonMessages.fieldMandatoryError} />
      errorMessage = "Enter valid Due Date";
    }
    //  if (!payload.subject) {
    //   fieldError['selected_subject'] = <FormattedMessage {...commonMessages.fieldMandatoryError} />
    //   errorMessage = "Select Subject";
    // } 
    if (
      !fieldValues.selected_standard
    ) {
      fieldError['selected_standard'] = <FormattedMessage {...commonMessages.fieldMandatoryError} />
      errorMessage = "Select standard";
    }
    if (
      fieldValues.selected_standard && fieldValues.selected_sections.length === 0
    ) {
      fieldError['selected_sections'] = <FormattedMessage {...commonMessages.fieldMandatoryError} />
      errorMessage = "Select section";
    }
    if (
      payload.student_details &&
      payload.student_details.length === 0
    ) {
      setsnackBar({
        openSnackbar: true,
        errorStatus: "Error",
        alertData: "Select Students",
      });
      errorMessage = "Select Students";
    }
    setfieldError(() => fieldError)
    return errorMessage;
  };

  const makeDeletableIds = (list1, list2, key) => {
    let deletedIds = [];
    for (const data of list1) {
      if (data[key] && !list2.includes(data[key])) {
        deletedIds.push(data[key]);
      }
    }
    return deletedIds;
  };

  return (
    <Box className="button-align margin-auto-md-down">
      {canCreateHomeWork && (
        <Button
          variant="contained"
          onClick={() => props.handleNavigateCreate()}
          className="mb-10 create-hw-button"
        >
          <Box className="even-flex-prop">
            <AddCircleOutlineOutlined className="visibility-icon" />
            Create Home Work
          </Box>
        </Button>
      )}
      <Dialog
        fullScreen
        open={openCreateHomeDialog}
        onClose={() => handleClose("homework")}
        TransitionComponent={Transition}
      >
        <AppBar className={"app-bar"}>
          <Toolbar className="app-bar-color">
            <IconButton
              edge="start"
              color="inherit"
              onClick={() => handleClose("clearAll")}
              aria-label="close"
            >
              <Close />
            </IconButton>
            <Typography variant="h6" className="diary-title">
              Home Work
            </Typography>


          </Toolbar>
        </AppBar>
        <Paper className="full-height">
          <Box className="paper-background md-down-p-0">
            {loadingData ?
              <div className="loading">
                <CircularProgress />
              </div>
              :
              <Paper className="diary-paper-container margin-auto">
                <Box className="homework-design mt-50 full-height">
                  <Box className="homework-left-part">
                    <Box className="md-up-ml-15 full-width">
                      <Box className="homework-title">
                        <Box>
                          <AssignmentOutlined className="marign-top-text"></AssignmentOutlined>
                          <TextField
                            className="text-background"
                            label="Title"
                            rowsMax={4}
                            InputProps={{ className: "textfield-background" }}
                            name={"title"}
                            max
                            value={fieldValues.title}
                            onChange={(e) => handleChange(e)}
                            variant="filled"
                            required
                            error={fieldError['title'] && fieldError['title']}
                            helperText={fieldError['title'] && fieldError['title']}
                            inputProps={{ maxLength: 250 }}
                          />
                        </Box>
                        <Box className="mt-20">
                          <Subject className="marign-top-text"></Subject>
                          <TextField
                            className="text-background"
                            id="filled-multiline-static"
                            label="Home Work Description"
                            InputProps={{ className: "textfield-background" }}
                            multiline
                            rows={4}
                            defaultValue=""
                            variant="filled"
                            name="description"
                            value={fieldValues.description}
                            onChange={(e) => handleChange(e)}
                            error={fieldError['description'] && fieldError['description']}
                            helperText={fieldError['description'] && fieldError['description']}
                          />
                        </Box>
                        <Box className="mt-20">
                          <EditTwoTone className="marign-top-text"></EditTwoTone>
                          <TextField
                            autoComplete="off"
                            className="text-background"
                            id="filled-multiline-static"
                            label="Home Work Points"
                            InputProps={{ className: "textfield-background" }}
                            defaultValue=""
                            variant="filled"
                            name="points"
                            value={fieldValues.points}
                            onChange={(e) => handleChange(e, "points")}
                            error={fieldError['points'] && fieldError['points']}
                            helperText={fieldError['points'] && fieldError['points']}
                            inputProps={{ maxLength: 4 }}
                          />
                        </Box>
                        {enableUploadIcons ? (
                          <Box className="upload-document-logo mt-50 margin-bottom-25">
                            <label htmlFor="upload-pic">
                              <Button
                                variant="raised"
                                component="span"
                                className="upload-document-logo-button"
                              >
                                Upload File
                                <Box className="upload-icon">
                                  <i
                                    className="fa fa-upload"
                                    aria-hidden="true"
                                  ></i>
                                </Box>
                              </Button>
                            </label>
                            <input
                              type="file"
                              id="upload-pic"
                              className="display-none"
                              onChange={(e) => handleChangeDoc(e, "file")}
                              onClick={(e) => (e.target.value = null)}
                            />
                          </Box>
                        ) : (
                          <CircularProgress />
                        )}
                        {uploadedData.map((data, index) => {
                          return (
                            <Box
                              key={data.id}
                              className="list-box-shadow"

                            >
                              <Box className="display-flex">
                                {data.isImage ? (
                                  <img src={data.file} height="20px" />
                                ) : (
                                  <i
                                    className="fa fa-file chat-doc"
                                    aria-hidden="true"
                                  ></i>
                                )}
                                <Box mx={3}
                                  className='text-underline cursor-pointer p-l-5px text-blue'
                                  onClick={() => subDialogOpen("img_comments", index)}>{data.name}</Box>
                              </Box>
                              <Box>
                                <i
                                  className="fa fa-times img-close pointer"
                                  aria-hidden="true"
                                  onClick={() => removeDoc(index)}
                                ></i>
                              </Box>
                            </Box>
                          );
                        })}
                      </Box>
                    </Box>
                  </Box>
                  <Divider
                    className="dividerheight"
                    orientation="vertical"
                    flexItem
                  />
                  <Box className="homework-right-part md-down-justify-space-evenly">
                    <Box className="dropdown-alignment">
                      <Box className="multiselect-dropdown diary-dropdown-standard">
                        <Dropdown
                          className="dropdown-min-width"
                          data={standardList}
                          name="selected_standard"
                          value={fieldValues.selected_standard}
                          onChange={(event) => onChangeStandard(event)}
                          label={`${alias_names['standard']}`}
                          hideSelect={true}
                          required
                          error={fieldError['selected_standard'] && fieldError['selected_standard']}
                          helperText={fieldError['selected_standard'] && fieldError['selected_standard']}
                        />
                      </Box>
                      <Box className="multiselect-dropdown">
                        <Autocomplete
                          limitTags={1}
                          multiple
                          id="checkboxes-tags-demo"
                          options={sectiondropdownlist}
                          disableCloseOnSelect
                          defaultValue={fieldValues.selected_sections}
                          value={fieldValues.selected_sections}
                          getOptionLabel={(option) => option.name}
                          onChange={(event, value) => onChangeSection(value)}
                          disabled={fieldValues.selected_standard ? false : true}
                          getOptionSelected={(option, value) => option.id === value.id}
                          required
                          renderOption={(option, { selected }) => {
                            return (
                              <React.Fragment>
                                <Checkbox
                                  icon={icon}
                                  checkedIcon={checkedIcon}
                                  style={{ marginRight: 8 }}
                                  checked={selected}
                                />
                                {option.name}
                              </React.Fragment>
                            );
                          }}
                          style={{ maxWidth: 500 }}
                          renderInput={(params) => (
                            <TextField
                              className="textfield-width"
                              {...params}
                              variant="outlined"
                              label={`${alias_names['section']}`}
                              error={fieldError['selected_sections'] && fieldError['selected_sections']}
                              helperText={fieldValues.selected_standard ? fieldError['selected_sections'] && fieldError['selected_sections'] : 'Select standard'}
                            />
                          )}
                        />
                      </Box>
                    </Box>
                    <Box className="dropdown-alignment">
                      <Box className="multiselect-dropdown diary-dropdown-sub">
                        {subjectListLoading ? (
                          <CircularProgress />
                        ) : (
                          <Dropdown
                            className="fit-width"
                            data={subjectList}
                            name="selected_subject"
                            value={fieldValues.selected_subject}
                            onChange={(e) => handleChange(e)}
                            label="Subject"
                            hideSelect={true}
                            error={fieldError['selected_subject'] && fieldError['selected_subject']}
                            helperText={fieldError['selected_subject'] && fieldError['selected_subject']}
                            customId={'subject'}
                            customName={'subject_name'}
                          />
                        )}
                      </Box>
                      <Box className="margin">
                        <MuiPickersUtilsProvider utils={DateFnsUtils}>
                          <KeyboardDatePicker
                            fullWidth
                            autoOk
                            variant="inline"
                            inputVariant="outlined"
                            label="Due Date"
                            name="duedate"
                            className="diary-due-date-picker"
                            minDate={user.other_details.academic_year.start_date}
                            maxDate={user.other_details.academic_year.end_date}
                            onChange={(e) => handleChange(e, "duedate")}
                            format="dd-MM-yyyy"
                            value={fieldValues.duedate}
                            KeyboardButtonProps={{
                              "aria-label": "change date",
                            }}
                            required
                            helperText={`Academic ${dateFormat(user.other_details.academic_year.start_date, 'DD-MM-YYYY')} - ${dateFormat(user.other_details.academic_year.end_date, 'DD-MM-YYYY')}`}
                          />
                        </MuiPickersUtilsProvider>
                      </Box>
                    </Box>
                    <List className="md-down-full-width">
                      <ListItem className="selectstudentpadding">
                        <ListItemText
                          className="studentselect"
                          primary={
                            studentsCount.current != 0
                              ? `${studentsCount.current} - Student(s)`
                              : "Students"
                          }
                        />
                        <IconButton
                          color="primary"
                          aria-label="add to shopping cart"
                          onClick={() => subDialogOpen("student")}
                        >
                          <PersonAddOutlined className="float-right" />
                        </IconButton>
                      </ListItem>
                      <Divider />
                    </List>
                    <List className="md-down-full-width">
                      <ListItem className="selectstudentpadding">
                        <ListItemText
                          className="studentselect"
                          primary={
                            alternateTeachersCount.current > 0
                              ? `${alternateTeachersCount.current} - Alternate Teacher(s)`
                              : `Alternate Teachers`
                          }
                        />
                        <IconButton
                          color="primary"
                          aria-label="add to shopping cart"
                          onClick={() => subDialogOpen("alternate_teacher")}
                        >
                          <PersonAddOutlined />
                        </IconButton>
                      </ListItem>
                      <Divider />
                    </List>
                  </Box>
                </Box>
              </Paper>
            }
          </Box>
          <Box className="submt-button-float-bottom">
            <Button
              variant="contained"
              color="primary"
              className="submit"
              disabled={submitDisable}
              onClick={() => saveHomeWork()}
            >
              <FormattedMessage {...commonMessages.submit} />
            </Button>
          </Box>
        </Paper>
        <Dialog
          maxWidth="sm"
          aria-labelledby="max-width-dialog-title"
          open={subactiveDialog === "alternate_teacher"}
          fullScreen={window.innerWidth < 980}
        >
          <DialogTitle id="max-width-dialog-title" className="text-center">
            Select Alternate Teacher
          </DialogTitle>
          <Divider className="teacher-dialog-seperator" />
          <table>
            <thead>
              <tr className="altTeachersHeading">
                <td className="teacherNameWidth text-center text-bold">
                  Teacher
                </td>
                <td className="editwidth text-bold text-center">
                  View
                </td>
                <td className="editwidth text-bold text-center">
                  update
                </td>
                <td className="editwidth text-bold text-center">
                  evaluate
                </td>
              </tr>
            </thead>
            <tbody>
              {teacherListTemp.map((data, index) => {
                const labelId = `checkbox-list-secondary-label-${data.id}`;
                return (
                  <tr key={data.id} className="altTeachersHeading">
                    <td className="teacherNameWidth diary-teacher-name">
                      <ListItemAvatar>
                        <Avatar
                          alt={data.full_name}
                          src={
                            data.profile_pic_details
                              ? data.profile_pic_details.file
                              : data.full_name
                          }
                        />
                      </ListItemAvatar>
                      <ListItemText id={labelId} primary={data.full_name} />
                    </td>
                    <td className="editwidth">
                      <Checkbox
                        edge="end"
                        onChange={() => updateTeacherStatus(index, "view")}
                        checked={data.view}
                        inputProps={{ "aria-labelledby": labelId }}
                      />
                    </td>
                    <td className="editwidth">
                      <Checkbox
                        edge="end"
                        onChange={() => updateTeacherStatus(index, "update")}
                        checked={data.update}
                        inputProps={{ "aria-labelledby": labelId }}
                      />
                    </td>
                    <td className="text-center editwidth">
                      <Checkbox
                        edge="end"
                        onChange={() => updateTeacherStatus(index, "evaluate")}
                        checked={data.evaluate}
                        inputProps={{ "aria-labelledby": labelId }}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <DialogActions
            className={window.innerWidth < 980 ? "bottom-buttons" : ""}
          >
            <Button
              variant="contained"
              color="primary"
              onClick={() => subDialogClose("alternate_teacher")}
            >
              Save
            </Button>
            <Button
              variant="outlined"
              className="margin-left-20"
              color="Secondary"
              onClick={() => subDialogClose("alternate_teacher_cancel")}
            >
              Cancel
            </Button>
          </DialogActions>
        </Dialog>
        <Dialog
          maxWidth="lg"
          aria-labelledby="max-width-dialog-title"
          open={subactiveDialog === "img_comments"}
          fullScreen={window.innerWidth < 980}
        >
          <Box className="p-20">
            {activeImgData.isImage ? (
              <img
                src={activeImgData.file}
                alt={activeImgData.fileName}
                className="border margin-auto"
                style={{ maxWidth: 300 }}
              />
            ) : (
              <iframe src={activeImgData.file} className="margin-auto"></iframe>
            )}
          </Box>
          <Box className="even-flex-prop">
            <TextField
              className="text-background pl-0"
              id="filled-multiline-static"
              label="Home Work Description"
              InputProps={{ className: "textfield-background" }}
              multiline
              rows={4}
              defaultValue=""
              variant="filled"
              name="active_img_description"
              value={activeImgData.comment}
              onChange={(e) => handleChange(e)}
            />
          </Box>
          <Divider className="teacher-dialog-seperator m-t-20px" />

          <DialogActions>
            <Button
              autoFocus
              onClick={() => subDialogClose("img_comments")}
              color="primary"
            >
              Save
            </Button>
            <Button
              autoFocus
              onClick={() => subDialogClose("img_comments_cancel")}
              color="primary"
            >
              Cancel
            </Button>
          </DialogActions>
        </Dialog>
        <Dialog
          className="md-down-full-width md-down-m-0"
          fullScreen={window.innerWidth <= 980}
          aria-labelledby="max-width-dialog-title"
          open={subactiveDialog === "student"}
        >
          <DialogTitle id="max-width-dialog-title" className="pb-0">
            Select Students
          </DialogTitle>
          <Box className="mt-10 full-width">
            <AccordionDetails className="full-width">
              <Box className="full-width pb-50">
                {fieldValues.selected_sections.map((data, index) => {
                  if (data.name === "All") return <></>;
                  return (
                    <Accordion
                      expanded={sectionExpanded === `panel-${index}`}
                      onChange={handleChangeInnerAccordion(data, index)}
                      key={`section-${index}`}
                    >
                      <AccordionSummary
                        expandIcon={<ExpandMore />}
                        aria-controls="panel1bh-content"
                        id="panel1bh-header"
                        className="border-bottom-line"
                      >
                        <Typography className="diary-section-detail-name ">
                          {data.name}
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails className="ph-10 pv-0 accordin-hover">
                        <Box className="text-content full-width">
                          <List className="diary-studentlist">
                            {studentsLoading ? (
                              <CircularProgress />
                            ) : (
                              <>
                                {studentListMapping[data.standard_section] &&
                                  studentListMapping[data.standard_section]
                                    .length === 0 ? (
                                  <Box className="studentList mb-10">
                                    {" "}
                                    No Students Enrolled
                                  </Box>
                                ) : null}
                                {studentListMapping[data.standard_section] &&
                                  studentListMapping[data.standard_section].map(
                                    (student, index) => {
                                      const labelId = `checkbox-list-secondary-label-${student.student}`;
                                      return (
                                        <ListItem
                                          key={student.student}
                                          button
                                          onClick={() =>
                                            handleToggle(
                                              data.standard_section,
                                              index,
                                              student.checked
                                            )
                                          }
                                        >
                                          <ListItemAvatar>
                                            <Avatar
                                              alt={student.name}
                                              src={
                                                student.profile_pic_details
                                                  ? student.profile_pic_details
                                                    .file
                                                  : student.name
                                              }
                                            />
                                          </ListItemAvatar>
                                          <ListItemText
                                            id={labelId}
                                            primary={student.name}
                                          />
                                          <ListItemSecondaryAction className="margin-left-30">
                                            <Checkbox
                                              edge="end"
                                              onChange={() =>
                                                handleToggle(
                                                  data.standard_section,
                                                  index,
                                                  student.checked
                                                )
                                              }
                                              checked={student.checked}
                                              inputProps={{
                                                "aria-labelledby": labelId,
                                              }}
                                            />
                                          </ListItemSecondaryAction>
                                        </ListItem>
                                      );
                                    }
                                  )}
                              </>
                            )}
                          </List>
                        </Box>
                      </AccordionDetails>
                    </Accordion>
                  );
                })}
              </Box>
            </AccordionDetails>
          </Box>
          <Box style={{ height: "100px" }} />
          <DialogActions
            className={window.innerWidth < 980 ? "bottom-buttons" : ""}
          >
            <Button
              variant="contained"
              color="primary"
              onClick={() => subDialogClose("student")}
            >
              Save
            </Button>
            <Button
              variant="outlined"
              className="margin-left-20"
              color="Secondary"
              onClick={() => subDialogClose("student_cancel")}
            >
              Cancel
            </Button>
          </DialogActions>
        </Dialog>
      </Dialog>
      <Snackbar
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        open={snackBar.openSnackbar}
        autoHideDuration={4000}
        onClose={(e) => handleCloseSnackBar(e)}
      >
        <Alert
          onClose={(e) => handleCloseSnackBar(e)}
          severity={snackBar.errorStatus}
        >
          {snackBar.alertData}
        </Alert>
      </Snackbar>
    </Box>
  );
});

CreateHomeWorkModal.propTypes = {
  standardList: PropTypes.array.isRequired,
  getHomeWorkList: PropTypes.func.isRequired,
};

export default CreateHomeWorkModal;
