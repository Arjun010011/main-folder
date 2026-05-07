// import React, { Component } from 'react';
// import get from '../../Components/actions/API_request/Get';
// import post from '../../Components/actions/API_request/Post';
// import {
//     Paper, Box, Typography, Grid,
//     Container, TextField, MenuItem,
//     Select, InputLabel, FormControl,
//     Button, Dialog, DialogTitle,
//     DialogActions, DialogContent
// } from '@material-ui/core';
// import Table from '@material-ui/core/Table';
// import TableContainer from '@material-ui/core/TableContainer';
// import TimetableRow from '../../Components/TimetableRow/TimetableRowComponent';
// import {
//     MuiPickersUtilsProvider,
//     KeyboardTimePicker,
//     TimePicker,
//     KeyboardDatePicker,
//     DatePicker
// } from '@material-ui/pickers';
// import moment from 'moment';
// import DateFnsUtils from '@date-io/date-fns';
// import { withStyles } from '@material-ui/core/styles';
// import { getRequest, postRequest } from 'Includes/api/apicall';
// import { GET_URL, POST_URL } from 'Includes/urls';

// const Styles = theme => ({
//     container: {
//         minHeight: '90vh',
//         padding: '2.2rem',
//     },
//     paperTitle: {
//         fontWeight: '500',
//         fontSize: '1.7rem',
//     },
//     paperCaption: {
//         color: '#bdbdbd',
//     },
//     timetableOptionsHolder: {
//         width: '80%',
//         margin: 'auto',
//         marginTop: '1.5rem',
//     },
//     formControl: {
//         margin: theme.spacing(1),
//         minWidth: 200,
//         maxWidth: 200,
//     },
//     tableSelects: {
//         margin: theme.spacing(1),
//         minWidth: 150,
//         maxWidth: 200,
//     },
//     table: {
//         borderRradius: "15px 0px 0px 15px",
//     }
//     // icon: {
//     //     fill: 'white',
//     //     top: '28px',
//     //     backgroundColor: '#1665D8',
//     //     width: '43px',
//     //     height: '28px',
//     // }
// });

// class TimetableContainer extends Component {

//     constructor(props) {
//         super(props);
//         this.state = {
//             academicYear: [],
//             classList: [],
//             sectionList: [],
//             currentSelectedList: {
//                 academic_year: '',
//                 standard: '',
//                 section: '',
//                 standard_section_id: '',
//                 timetable_id: '',
//             },
//             timeTableData: [],
//             availableTimetables: [],
//             dateRangeDialogOpen: null,
//             createdTimetableData: {},
//         }
//     }

//     selectChangeApiCalls = async (apiType, params) => {
//         let { currentSelectedList } = this.state;
//         if (apiType == "date_range") {
//             // Fetch available timetables for the respective academic year
//             let retrievedTimetableData = await get('hr/timetabledaterange', `?academic_year=${params.academicYearId}&standard_section=${params.standardSectionId}`);
//             return retrievedTimetableData;
//         } else if (apiType == "standard") {
//             // Fetch Class list
//             let standardUrl = 'classes/getstandard';
//             let standardResp = await get(standardUrl, `?academic_year=${params.academicYearId}`);
//             if (standardResp.data) {
//                 return standardResp.data;
//             } else {
//                 return [];
//             }
//         } else if (apiType == "section") {
//             let sectionList = await get('classes/getsection', `?academic_year=${params.academicYearId}&standard=${params.selectedClassId}`);
//             if (sectionList.data) {
//                 return sectionList.data;
//             } else {
//                 return [];
//             }
//         }
//     }

//     componentDidMount = async () => {
//         let academicUrl = 'institutes/getacademicyear';
//         let academicData = await get(academicUrl);
//         if (academicData && academicData.data) {
//             let academicYear = academicData.data.map((record) => {
//                 let year = {};
//                 year['id'] = record.id;
//                 year['name'] = record.name;
//                 return year;
//             });
//             this.setState({ academicYear });
//         }
//     }


//     shouldComponentUpdate = async (nextProps, nextState) => {
//         // if(nextState.currentSelectedList.academic_year != this.state.currentSelectedList.academic_year) {
//         //     let { currentSelectedList } = {...nextState};
//         //     let academicYearId = nextState.currentSelectedList.academic_year;   
//         //     currentSelectedList.academic_year = academicYearId;
//         //     // Fetch available timetables for the respective academic year
//         //     let retrievedTimetableData = await get('hr/timetabledaterange', `?academic_year=${academicYearId}`);
//         //     this.setState({ currentSelectedList: currentSelectedList, availableTimetables: retrievedTimetableData });
//         //     return true
//         // } else {
//         //     return false;
//         // }
//     }

//     componentDidUpdate = async (prevProps, prevState) => {
//         let currentSelectedList = { ...this.state.currentSelectedList };
//         let [timeTableData, availableTimetables, classList, sectionList] = [this.state];
//         if (prevState.currentSelectedList.academic_year != '' && prevState.currentSelectedList.academic_year != currentSelectedList.academic_year) {
//             currentSelectedList.sectionList = '';
//             currentSelectedList.standard = '';
//             currentSelectedList.standard_section_id = '';
//             let academicYearId = currentSelectedList.academic_year;
//             currentSelectedList.timetable_id = '';
//             timeTableData = [];
//             availableTimetables = [];
//             classList = [];
//             sectionList = [];
//             timeTableData = [];
//             classList = await this.selectChangeApiCalls("standard", { 'academicYearId': academicYearId });
//             this.setState({ currentSelectedList, timeTableData, availableTimetables, classList, sectionList });
//         } else if (prevState.currentSelectedList.standard != '' && prevState.currentSelectedList.standard != currentSelectedList.standard) {
//             currentSelectedList.sectionList = '';
//             currentSelectedList.standard = '';
//             currentSelectedList.standard_section_id = '';
//             let academicYearId = currentSelectedList.academic_year;
//             currentSelectedList.timetable_id = '';
//             timeTableData = [];
//             availableTimetables = [];
//             sectionList = [];
//             timeTableData = [];
//             sectionList = await this.selectChangeApiCalls('section', { 'academicYearId': academicYearId, 'selectedClassId': currentSelectedList.standard })
//             this.setState({ currentSelectedList, timeTableData, availableTimetables, sectionList });
//         } else if (prevState.currentSelectedList.section != '' && prevState.currentSelectedList.section != currentSelectedList.section) {
//             let academicYearId = currentSelectedList.academic_year;
//             currentSelectedList.timetable_id = '';
//             timeTableData = [];
//             availableTimetables = [];
//             timeTableData = [];
//             let retrievedTimetableData = await this.selectChangeApiCalls('date_range', { 'academicYearId': academicYearId, 'standardSectionId': currentSelectedList['standard_section_id'] })
//             this.setState({ currentSelectedList, availableTimetables: retrievedTimetableData, timeTableData });
//             // this.setState({ currentSelectedList, timeTableData, availableTimetables, sectionList });
//         }
//     }

//     academicYearChange = async (e) => {
//         let currentSelectedList = { ...this.state.currentSelectedList };
//         let academicYearId = e.target.value;
//         currentSelectedList.academic_year = academicYearId;
//         let standardList = await this.selectChangeApiCalls("standard", { 'academicYearId': academicYearId });
//         this.setState({ currentSelectedList: currentSelectedList, classList: standardList });
//     }

//     standardChange = async (e) => {
//         let { currentSelectedList } = { ...this.state };
//         let selectedClassId = e.target.value;
//         let academicYearId = currentSelectedList.academic_year;
//         currentSelectedList['standard'] = selectedClassId;
//         let sectionList = await this.selectChangeApiCalls('section', { 'academicYearId': academicYearId, 'selectedClassId': selectedClassId })
//         this.setState({ sectionList: sectionList, currentSelectedList: currentSelectedList });
//     }

//     sectionChange = async (e) => {
//         let { sectionList } = { ...this.state };
//         let currentSelectedList = { ...this.state.currentSelectedList };
//         let selectedSectionId = e.target.value;
//         let academicYearId = currentSelectedList.academic_year;
//         currentSelectedList['section'] = selectedSectionId;
//         let standardSectionId = sectionList.filter(section => section.id == selectedSectionId);
//         currentSelectedList['standard_section_id'] = (standardSectionId.length) ? standardSectionId[0].standard_section : null;
//         let retrievedTimetableData = await this.selectChangeApiCalls('date_range', { 'academicYearId': academicYearId, 'standardSectionId': currentSelectedList['standard_section_id'] })
//         this.setState({ currentSelectedList, availableTimetables: retrievedTimetableData });
//     }

//     // Timetable Specific Functions
//     handleDialogOpen = async (e) => {
//         if (e.target.value === "Calendar") {
//             this.setState({ dateRangeDialogOpen: !this.state.dateRangeDialogOpen });
//         } else {
//             // Store selected timetable 
//             let { currentSelectedList } = { ...this.state };
//             currentSelectedList['timetable_id'] = e.target.value
//             this.setState({ currentSelectedList });
//         }
//     }

//     submitTimetableForCreation = async (e) => {
//         const { currentSelectedList, createdTimetableData } = { ...this.state };
//         let timetableDataToSend = {};
//         timetableDataToSend["academic_year"] = currentSelectedList.academic_year;
//         timetableDataToSend = { ...timetableDataToSend, ...createdTimetableData };
//         let params = { academic_year: currentSelectedList.academic_year };
//         postRequest(POST_URL.timetabledaterange.api, timetableDataToSend, params).then((response) => {
//             if (response.status == 200) {
//                 let retrievedTimetableData = response.data.data;
//                 this.setState({ dateRangeDialogOpen: !this.state.dateRangeDialogOpen, availableTimetables: retrievedTimetableData });
//             }
//         });
//     }

//     handleTimetableCreation = (e, type) => {
//         let createdTimetableData = { ...this.state.createdTimetableData };
//         let timetableField = (e.currentTarget) ? e.currentTarget.name : type;
//         let timetableFieldValue = (e.currentTarget) ? e.currentTarget.value : e;
//         if (type && (timetableField == "start_date" || timetableField == "end_date")) {
//             timetableFieldValue = moment(timetableFieldValue).format("YYYY-MM-DD");
//         }
//         createdTimetableData[timetableField] = timetableFieldValue;
//         this.setState({ createdTimetableData });
//     }

//     closeTimetableDialog = (e) => {
//         this.setState({ dateRangeDialogOpen: null });
//     }

//     render() {
//         const { classes } = this.props;
//         const { academicYear, classList, sectionList, dialogs, dateRangeDialogOpen,
//             periodRangeDialogOpen, periodList, currentSelectedList, availableTimetables, timeTableData } = this.state;
//         let tableData = [];
//         let dateRangeDialog = (<Dialog
//             buttonid="dateDialog"
//             open={dateRangeDialogOpen}
//             onClose={(e) => { this.closeTimetableDialog(e) }}
//             aria-labelledby="alert-dialog-title"
//             aria-describedby="alert-dialog-description"
//         >
//             <DialogTitle id="alert-dialog-title">{"Select Required Dates111"}</DialogTitle>
//             <DialogContent>
//                 <Grid container direction="column" spacing={0}>
//                     <Grid item>
//                         <TextField
//                             onChange={(e) => { this.handleTimetableCreation(e) }}
//                             fullWidth
//                             id="timetableName"
//                             label="Timetable Name"
//                             name="name"
//                             margin="normal"
//                             variant="outlined"
//                         />
//                     </Grid>
//                     <Grid item>
//                         <MuiPickersUtilsProvider utils={DateFnsUtils}>
//                             <Grid container justify="space-around">
//                                 <KeyboardDatePicker
//                                     disableToolbar
//                                     variant="inline"
//                                     format="yyyy-MM-dd"
//                                     margin="normal"
//                                     autoOk={true}
//                                     name="start_date"
//                                     id="fromDate"
//                                     label="From Date"
//                                     onChange={(e) => { this.handleTimetableCreation(e, "start_date") }}
//                                     KeyboardButtonProps={{
//                                         'aria-label': 'change date',
//                                     }}
//                                 />
//                             </Grid>
//                         </MuiPickersUtilsProvider>
//                     </Grid>
//                     <Grid item>
//                         <MuiPickersUtilsProvider utils={DateFnsUtils}>
//                             <Grid container justify="space-around">
//                                 <KeyboardDatePicker
//                                     disableToolbar
//                                     variant="inline"
//                                     format="yyyy-MM-dd"
//                                     margin="normal"
//                                     name="end_date"
//                                     id="toDate"
//                                     label="To Date"
//                                     autoOk={true}
//                                     onChange={(e) => { this.handleTimetableCreation(e, "end_date") }}
//                                     KeyboardButtonProps={{
//                                         'aria-label': 'change date',
//                                     }}
//                                 />
//                             </Grid>
//                         </MuiPickersUtilsProvider>
//                     </Grid>
//                 </Grid>
//             </DialogContent>
//             <DialogActions>
//                 <Button mappedid="dateDialog" onClick={(e) => { this.submitTimetableForCreation(e) }} color="primary">Create</Button>
//             </DialogActions>
//         </Dialog>);


//         // Academic Year Menu Items 
//         let academicMenuItems = academicYear.map((record) => {
//             return <MenuItem key={record.id} standardsectionid={record.standard_section} value={record.id}>{`${record.name}`}</MenuItem>
//         });

//         // Class List Menu Items
//         let classListItems = classList.map((record) => {
//             return <MenuItem key={record.id} value={record.id}>{record.name}</MenuItem>
//         });

//         // Section List Items
//         let sectionListItems = sectionList.map((record) => {
//             return <MenuItem key={record.id} value={record.id}>{record.name}</MenuItem>
//         });

//         let availableTimetableItems = availableTimetables.map((record) => {
//             return <MenuItem key={record.id} value={record.id}>{record.name}</MenuItem>
//         });

//         availableTimetableItems.push(<MenuItem key="addtimetable" value="Calendar">
//             Add
//         </MenuItem>);


//         return (
//             <Container maxWidth={false}>
//                 {dateRangeDialog}
//                 <Paper className={classes.container}>
//                     <Box>
//                         <Typography className={classes.paperTitle} variant="h6" color="primary">
//                             Create Time Table
//                         </Typography>
//                         <Typography className={classes.paperCaption} variant="subtitle1">
//                             Here you can schedule the timetable and allot subjects
//                         </Typography>
//                     </Box>
//                     <Grid className={classes.timetableOptionsHolder}>
//                         <Grid container direction="row" justify="space-between" spacing={0}>
//                             <Grid item>
//                                 <FormControl variant="outlined" className={classes.formControl}>
//                                     <InputLabel id="academic-year-label">
//                                         Select Academic Year
//                                     </InputLabel>
//                                     <Select
//                                         labelId="academic-year-label"
//                                         id="academic-year"
//                                         class={classes.select}
//                                         onChange={(e) => { this.academicYearChange(e) }}
//                                     // inputProps={{
//                                     //     classes: {
//                                     //         icon: classes.icon,
//                                     //     }
//                                     // }}
//                                     >
//                                         {academicMenuItems}
//                                     </Select>
//                                 </FormControl>
//                             </Grid>
//                             <Grid item>
//                                 <FormControl variant="outlined" className={classes.formControl}>
//                                     <InputLabel id="select-standard-label">
//                                         Select Standard
//                                     </InputLabel>
//                                     <Select
//                                         id="select-standard"
//                                         select
//                                         label="Select Standard"
//                                         helperText="Select Standard"
//                                         variant="outlined"
//                                         disabled={(currentSelectedList.academic_year !== '') ? false : true}
//                                         onChange={(e) => { this.standardChange(e) }}
//                                     >
//                                         {classListItems.length !== 0 ? classListItems : null}
//                                     </Select>
//                                 </FormControl>
//                             </Grid>
//                             <Grid item>
//                                 <FormControl variant="outlined" className={classes.formControl}>
//                                     <InputLabel id="select-section-label">
//                                         Select Section
//                                     </InputLabel>
//                                     <Select
//                                         id="select-section"
//                                         select
//                                         label="Select Section"
//                                         helperText="Select Section"
//                                         variant="outlined"
//                                         disabled={(currentSelectedList.standard !== '') ? false : true}
//                                         onChange={(e) => { this.sectionChange(e) }}
//                                     >

//                                         {currentSelectedList.standard && sectionListItems.length !== 0 ? sectionListItems : null}
//                                     </Select>
//                                 </FormControl>
//                             </Grid>
//                             <Grid item>
//                                 <FormControl variant="outlined" className={classes.formControl}>
//                                     <InputLabel id="academic-year-label">
//                                         Select Timetable
//                                     </InputLabel>
//                                     <Select
//                                         id="selectDateRange"
//                                         select
//                                         label="Timetable"
//                                         helperText="Timings"
//                                         variant="outlined"
//                                         disabled={(currentSelectedList.standard_section_id !== '') ? false : true}
//                                         onChange={(e) => { this.handleDialogOpen(e) }}
//                                     >

//                                         {availableTimetableItems && availableTimetableItems.length ? availableTimetableItems : null}
//                                     </Select>
//                                 </FormControl>
//                             </Grid>
//                         </Grid>

//                     </Grid>
//                     <Box mt={5}>
//                         <Grid container direction="column" spacing={0}>
//                             <Grid item xs={12}>
//                                 <TableContainer component={Paper}>
//                                     <Table className={classes.table} aria-label="timetable">
//                                         {currentSelectedList && currentSelectedList.standard_section_id && currentSelectedList.timetable_id ? <TimetableRow classes={classes} currentSelectedList={currentSelectedList} /> : null}
//                                     </Table>
//                                 </TableContainer>
//                             </Grid>
//                         </Grid>
//                     </Box>
//                 </Paper>

//             </Container>
//         )
//     }
// }

// export default withStyles(Styles)(TimetableContainer);


// // (<MenuItem  key="addtimetable" value="Calendar">
// //                                             Add
// //                                         </MenuItem>)