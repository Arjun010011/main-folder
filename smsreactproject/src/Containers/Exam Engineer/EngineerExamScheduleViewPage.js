import React, { useEffect, useState } from "react";
import { CircularProgress, Box, Button, Grid } from "@material-ui/core";
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import { Link } from 'react-router-dom';
import classNames from 'classnames';
import { getRequest } from "Includes/api/apicall";
import { GET_URL } from "Includes/urls";
import AllMUIDataTable from "Components/AllMUIDataTable";
import { Actions } from 'Constants/permissions';
// import StudentListActions from "Components/StudentListActions";  // <-- replace with your actual actions component
// import { FormattedMessage } from "react-intl"; // if you use messages

const ExamScheduleQuestionView = (props) => {
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getExamScheduleList();
    }, [props]);

    const getExamScheduleList = async () => {
        setLoading(true);
        const res = await getRequest(GET_URL.examschedulequestionmapping.api, {}, props);
        if (res && res.data) {
            setQuestions(res.data);
        }
        setLoading(false);
    };

    const columns = [
        {
            name: "id",
            label: "ID",
            options: {
                filter: false,
                sort: false,
                viewColumns: false,
                display: false,
                download: false
            }
        },
        {
            name: "question_number",
            label: "Q. No",
            options: {
                filter: true,
                sort: true,
            }
        },
        {
            name: "sub_question_number",
            label: "Sub Q.",
            options: {
                filter: true,
                sort: true,
            }
        },
        {
            name: "description",
            label: "Description",
            options: {
                filter: false,
                sort: false,
            }
        },
        {
            name: "max_marks",
            label: "Max Marks",
            options: {
                filter: false,
                sort: true,
            }
        },
        {
            name: "min_marks",
            label: "Min Marks",
            options: {
                filter: false,
                sort: true,
            }
        },
        {
            name: "sequence",
            label: "Sequence",
            options: {
                filter: false,
                sort: true,
            }
        },
        {
            name: "group_name",
            label: "Group",
            options: {
                filter: true,
                sort: true,
            }
        },
        {
            name: "exam_schedule",
            label: "Exam Schedule",
            options: {
                filter: true,
                sort: true,
            }
        },
        {
            name: "created",
            label: "Created",
            options: {
                filter: false,
                sort: true,
                customBodyRender: (value) => new Date(value).toLocaleDateString(),
            },
        },
        // {
        //     name: "Actions",
        //     label: "Actions", // or <FormattedMessage {...commonMessages.actions} />
        //     options: {
        //         filter: false,
        //         sort: false,
        //         download: false,
        //         customBodyRender: (value, tableMeta) => {
        //             return (
        //                 <div>
        //                     {/* Replace with your custom action buttons */}
        //                     <Button
        //                         size="small"
        //                         color="primary"
        //                         component={Link}
        //                         to={`${Actions.exam_schedule_engineer.update.url}/${tableMeta.rowData[0]}`}
        //                     >
        //                         Edit
        //                     </Button>
        //                     <Button
        //                         size="small"
        //                         color="secondary"
        //                         onClick={() => console.log("Delete ID:", tableMeta.rowData[0])}
        //                     >
        //                         Delete
        //                     </Button>
        //                 </div>
        //             );
        //         }
        //     }
        // }
    ];

    const options = {
        selectableRows: "none",
        filterType: "dropdown",
        responsive: "simple",
        filter: false,
        download: true,
        print: false,
        viewColumns: false,
        rowsPerPageOptions: [5, 10, 25, 50, 100],
        // onTableChange: () => getExamScheduleList(),
    };

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" p={2}>
                <Grid item md={6} xs={12} className={classNames('header-align')}>
                    <Box className='heading'>
                        Exam Schedule Questions
                    </Box>
                </Grid>
                <Grid item md={6} xs={12}>
                    <Box className={classNames('header-align', 'end-flex-prop')}>
                        <Button
                            variant="contained"
                            component={Link} 
                            to={Actions.exam_schedule_engineer.create.url}
                            className='editbutton-view'
                        >
                            <AddCircleOutlineOutlinedIcon className='visibility-icon' /> 
                            {Actions.exam_schedule_engineer.create.label}
                        </Button>
                    </Box>
                </Grid>
            </Box>

            {loading ? (
                <Box display="flex" justifyContent="center" p={4}>
                    <CircularProgress />
                </Box>
            ) : (
                <AllMUIDataTable
                    data={questions}
                    columns={columns}
                    options={options}
                />
            )}
        </Box>
    );
};

export default ExamScheduleQuestionView;
