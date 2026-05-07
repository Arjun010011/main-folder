import React, { useState, useEffect, useRef } from 'react';
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
    Grid
} from "@material-ui/core";
import {
    ExpandMore,
    PersonAddOutlined,
} from "@material-ui/icons";
import { cloneDeep } from "lodash";


import { TEACHER_ID, maxFileSize } from "Constants";
import { getRequest, postRequest, putRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL, PUT_URL } from "Includes/urls";

function AddStudentToCreateFeedBackForm(props) {

    const { selected_sections, isEdit, get_details, subject_list, current_standard, year } = props;
    const baseStudentsIdsRef = useRef({});
    const studentListMappingRef = useRef({});
    const alternateTeachersCount = useRef(0);
    const baseStaffDataRef = useRef({});

    const [snackBar, setsnackBar] = useState({
        openSnackbar: false,
        errorStatus: "",
        alertData: "",
    });
    const [studentListMapping, setstudentListMapping] = useState({});
    const [sectionExpanded, setsectionExpanded] = useState(false);
    const [studentsLoading, setstudentsLoading] = useState(false);
    const [subactiveDialog, setsubactiveDialog] = useState(false);
    const [teacherList, setteachersList] = useState([]);
    const [teacherListTemp, setteacherListTemp] = useState([]);
    const [studentId, setStudentId] = useState([]);
    const [staffId, setStaffId] = useState([]);


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

    const getStudentList = async (standard_section, sectionId, index) => {
        setstudentsLoading(() => true);
        setsectionExpanded(() => `panel-${index}`);
        const params = {
            academic_year: year,
            standard: current_standard,
            section: sectionId,
        };
        let url = GET_URL.getenrolledstudents.api;
        const studentListMappingTemp = cloneDeep(studentListMapping);
        getRequest(url, params).then((response) => {
            setstudentsLoading(() => false);
            if (response && response.status === 200) {
                if (response.data.data.length > 0)
                    response.data.data.unshift({ id: 'all', name: 'All', checked: false })
                let sectionStudentList = response.data.data.map((student) => {
                    if (baseStudentsIdsRef.current[student.student]) {
                        student.checked = true
                        student.diary_student_id = baseStudentsIdsRef.current[student.student];
                    }
                    else {
                        student.checked = false
                    }
                    return student;
                });
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
            let is_all_checked=true
            studentListMappingTemp[standard_section].map((data,index)=>{
                if(!data.checked && index!==0){
                    is_all_checked=false
                }
            })
            studentListMappingTemp[standard_section][0].checked=is_all_checked
            setstudentListMapping(() => studentListMappingTemp);
        }
    };

    const subDialogClose = (status) => {
        if (status === "alternate_teacher") {
            const teacherListDup = cloneDeep(teacherListTemp);
            let staffId = []
            teacherListDup.forEach((teacher) => {
                if (teacher.view || teacher.evaluate || teacher.update) {
                    staffId.push(teacher)
                }
            });
            setteachersList(() => teacherListDup);
            const studentListMappingTemp = cloneDeep(studentListMapping);
            setstudentListMapping(() => studentListMappingTemp);
            setStaffId(() => staffId)
            props.updateStaff(staffId)
        } else if (status === "alternate_teacher_cancel") {
            const teacherListDup = cloneDeep(teacherList);
            setteacherListTemp(() => teacherListDup);
            const studentListMappingTemp = cloneDeep(studentListMapping);
            setstudentListMapping(() => studentListMappingTemp);
            props.updateStaff(staffId)
        } else if (status === "student") {
            let studentId = []
            Object.keys(studentListMapping).map((section) => {
                studentListMapping[section].map((student) => {
                    if (student.checked && student.id !== 'all') {
                        studentId.push(student)
                    }
                })
            })
            studentListMappingRef.current = studentListMapping;
            setStudentId(() => studentId)
            props.updateStudent(studentId)
        } else if (status === "student_cancel") {
            const studentListMappingTemp = studentListMappingRef.current;
            setstudentListMapping(() => studentListMappingTemp);
            props.updateStudent(studentId)
        }
        setsubactiveDialog(() => false);
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
            if (selected_sections.length === 0) {
                props.updateSectionError()
                return;
            }
            setsubactiveDialog(() => type);
            if (selected_sections.length > 0) {
                const index = 0;
                const firstSection = selected_sections[index];
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
        }
    };

    const updateTeacherStatus = (index, type) => {
        const teacherListDup = cloneDeep(teacherListTemp);
        teacherListDup[index][type] = !teacherListDup[index][type];
        if (type === 'evaluate') {
            teacherListDup[index]['view'] = teacherListDup[index][type];
            teacherListDup[index]['update'] = teacherListDup[index][type];

        }else if(type === 'update'){
            teacherListDup[index]['view'] = teacherListDup[index][type];
        }
        setteacherListTemp(() => teacherListDup);
    };


    const fetchTeacherList = () => {
        const params = { group: TEACHER_ID };
        getRequest(GET_URL.staff.api, params).then((response) => {
            if (response && response.status === 200) {
                const response_data = response.data.data;
                response_data.forEach((data) => {
                    data.view = false;
                    data.update = false;
                    data.evaluate = false;
                    data.diary_staff_id = undefined;
                    if (baseStaffDataRef.current[data.id]) {
                        data.view = baseStaffDataRef.current[data.id].view;
                        data.update = baseStaffDataRef.current[data.id].update;
                        data.evaluate = baseStaffDataRef.current[data.id].evaluate;
                        data.diary_staff_id = baseStaffDataRef.current[data.id].id;
                    }
                });
                setteacherListTemp(() => response_data);
                setteachersList(() => response_data);
            }
        });
    }

    React.useEffect(() => {
        if (isEdit) {
            get_details.student_form_mapping_form.map((student) => {
                baseStudentsIdsRef.current[student.student] = true
            })
            get_details.alternate_teacher_mapping_form.map((staff) => {
                baseStaffDataRef.current[staff.staff] = {}
                baseStaffDataRef.current[staff.staff]['view'] = staff.view
                baseStaffDataRef.current[staff.staff]['update'] = staff.update
                baseStaffDataRef.current[staff.staff]['evaluate'] = staff.evaluate
            })
            setStudentId(() => get_details.student_form_mapping_form)
            setStaffId(() => get_details.alternate_teacher_mapping_form)
        }
    }, [isEdit]);

    return (
        <div>
            <Grid container>
                <Grid item md={6} xs={12}>
                    <List className="md-down-full-width">
                        <ListItem className="selectstudentpadding">
                            <ListItemText
                                className="studentselect dividerwidth"
                                primary={
                                    studentId.length > 0
                                        ? `${studentId.length} Students *`
                                        : `Students *`
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
                        <Divider className="dividerwidth" />
                    </List>
                </Grid>
                <Grid item md={6} xs={12}>
                    <List className="md-down-full-width">
                        <ListItem className="selectstudentpadding">
                            <ListItemText
                                className="studentselect dividerwidth"
                                primary={
                                    staffId.length > 0
                                        ? `${staffId.length} Alternate Teachers`
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
                        <Divider className="dividerwidth" />
                    </List>
                </Grid>
            </Grid>
            <Dialog
                maxWidth="md"
                aria-labelledby="max-width-dialog-title"
                open={subactiveDialog === "student"}
            >
                <DialogTitle id="max-width-dialog-title">Select Students</DialogTitle>
                <Box className="studentsSelect full-width">
                    <AccordionDetails>
                        <Box>
                            {selected_sections.map((data, index) => {
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
                                        >
                                            <Typography className="diary-section-detail-name">
                                                {data.name}
                                            </Typography>
                                        </AccordionSummary>
                                        <AccordionDetails className="text-border accordin-hover">
                                            <Box className="text-content add-student-list-create-quiz">
                                                {studentsLoading ? (
                                                    <CircularProgress />
                                                ) : (
                                                    <List className="diary-studentlist">
                                                        {studentListMapping[data.standard_section] &&
                                                            studentListMapping[data.standard_section]
                                                                .length === 0 &&
                                                            <Box className="studentList mb-10">
                                                                "No Students Enrolled"
                                                            </Box>
                                                        }
                                                        <Box className=''>
                                                            {studentListMapping[data.standard_section] &&
                                                                studentListMapping[data.standard_section].map(
                                                                    (student, index) => {
                                                                        const labelId = `student-${student.student}`;
                                                                        return (
                                                                            <ListItem
                                                                                key={student.student}
                                                                                button
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
                                                                                <ListItemSecondaryAction className='margin-left-30'>
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
                                                                                        defaultChecked={student.checked}
                                                                                        inputProps={{
                                                                                            "aria-labelledby": labelId,
                                                                                        }}
                                                                                    />
                                                                                </ListItemSecondaryAction>
                                                                            </ListItem>
                                                                        );
                                                                    }
                                                                )}
                                                        </Box>
                                                    </List>
                                                )}
                                            </Box>
                                        </AccordionDetails>
                                    </Accordion>
                                );
                            })}
                        </Box>
                    </AccordionDetails>
                </Box>
                <DialogActions>
                    <Button
                        autoFocus
                        onClick={() => subDialogClose("student")}
                        color="primary"
                    >
                        Save
                    </Button>
                    <Button
                        autoFocus
                        onClick={() => subDialogClose("student_cancel")}
                        color="primary"
                    >
                        Cancel
                    </Button>
                </DialogActions>
            </Dialog>
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
                <Box className="altTeachersHeading">
                    <Box className="teacherNameWidth text-center text-bold">
                        Teacher
                    </Box>
                    <Box className="editwidth text-bold">View</Box>
                    <Box className="editwidth text-bold">update</Box>
                    <Box className="text-bold">evaluate</Box>
                </Box>
                <Box>
                    {teacherListTemp.map((data, index) => {
                        const labelId = `staff-${data.id}`;
                        return (
                            <Box key={data.id} className="altTeachersHeading">
                                <Box className="teacherNameWidth diary-teacher-name">
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
                                </Box>
                                <Box className="editwidth">
                                    <Checkbox
                                        edge="end"
                                        onChange={() => updateTeacherStatus(index, "view")}
                                        checked={data.view}
                                        disabled={data.evaluate}
                                        inputProps={{ "aria-labelledby": labelId }}
                                    />
                                </Box>
                                <Box className="editwidth">
                                    <Checkbox
                                        edge="end"
                                        onChange={() => updateTeacherStatus(index, "update")}
                                        checked={data.update}
                                        disabled={data.evaluate}
                                        inputProps={{ "aria-labelledby": labelId }}
                                    />
                                </Box>
                                <Box>
                                    <Checkbox
                                        edge="end"
                                        onChange={() => updateTeacherStatus(index, "evaluate")}
                                        checked={data.evaluate}
                                        inputProps={{ "aria-labelledby": labelId }}
                                    />
                                </Box>
                            </Box>
                        );
                    })}
                </Box>
                <DialogActions>
                    <Button
                        autoFocus
                        onClick={() => subDialogClose("alternate_teacher")}
                        color="primary"
                    >
                        Save
                    </Button>
                    <Button
                        autoFocus
                        onClick={() => subDialogClose("alternate_teacher_cancel")}
                        color="primary"
                    >
                        Cancel
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    )
}

export default AddStudentToCreateFeedBackForm