import React from 'react';
import clsx from 'clsx';
import { makeStyles, useTheme } from '@material-ui/core/styles';
import SchoolOutlinedIcon from '@material-ui/icons/SchoolOutlined';
import Drawer from '@material-ui/core/Drawer';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import './Dashboard.scss'
import List from '@material-ui/core/List';
import CssBaseline from '@material-ui/core/CssBaseline';
import Typography from '@material-ui/core/Typography';
// import Divider from '@material-ui/core/Divider';
import IconButton from '@material-ui/core/IconButton';
import MenuIcon from '@material-ui/icons/Menu';
import ListItem from '@material-ui/core/ListItem';
// import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
// import InboxIcon from '@material-ui/icons/MoveToInbox';
// import MailIcon from '@material-ui/icons/Mail';
import { Link, withRouter } from 'react-router-dom'
import { MenuItem, Box, FormLabel, Button } from '@material-ui/core'
import Collapse from '@material-ui/core/Collapse';
import ExpandLess from '@material-ui/icons/ExpandLess';
import ExpandMore from '@material-ui/icons/ExpandMore';
// import SchoolDetailsForm from '../Components/Forms/SchoolDetails'
import ArrowBackIosIcon from '@material-ui/icons/ArrowBackIos';
// import FeesPlan from './Forms/Finance/FeesPlan';
import DashboardOutlinedIcon from '@material-ui/icons/DashboardOutlined';
import PeopleAltOutlinedIcon from '@material-ui/icons/PeopleAltOutlined';
// import Icon from '@material-ui/core/Icon';
import Avatar from '@material-ui/core/Avatar';
// import sachin from 'images/sachin.jpg';
import user from 'images/user.jpg';
import user1 from 'images/userdummy.jpeg'
import ArrowForwardIosIcon from '@material-ui/icons/ArrowForwardIos';
import SupervisorAccountIcon from '@material-ui/icons/SupervisorAccount';

// import EnquiryStudentsList from './Forms/StudentForm/Enquiry_Form/EnquiryStudentsList';
// import ApplicationStudentList from './Forms/StudentForm/Application_Form/ApplicationStudentList';
// import AdmissionStudentList from './Forms/StudentForm/AdmissionForm/AdmissionStudentList'


const drawerWidth = 270;

const useStyles = makeStyles(theme => ({
    root: {
        display: 'flex',
    },
    appBar: {
        zIndex: theme.zIndex.drawer + 1,
        transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
        }),
        // backgroundColor: "#4680FF !important",
        backgroundColor: "#d699f6 !important",
        boxShadow: "none"
    },
    appBarShift: {
        marginLeft: drawerWidth,
        width: `calc(100% )`,
        transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
        }),
    },
    menuButton: {
        marginRight: 36,
    },
    hide: {
        display: 'none',
    },
    drawer: {
        width: drawerWidth,
        flexShrink: 0,
        whiteSpace: 'nowrap',
        overflow: "auto",
        marginBottom: '40px'

    },

    drawerOpen: {
        width: drawerWidth,


        padding: "13px",
        transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
        }),
        '@media (max-width:780px)': {
            // eslint-disable-line no-useless-computed-key
            // maxWidth: '170px',

            position: "fixed",
            zIndex: "99",
            marginTop: '70px'
            // maxHeight: '400px',
        },
        marginTop: '70px',
        marginBottom: '50px'

    },
    drawerClose: {
        // transition: ".4s",
        transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
        }),
        overflowX: 'hidden',
        width: theme.spacing(7) + 1,
        [theme.breakpoints.up('sm')]: {
            width: theme.spacing(9) + 1,
        },
        '@media (max-width:780px)': {
            // eslint-disable-line no-useless-computed-key
            // maxWidth: '170px',
            position: "fixed",
            zIndex: "99",
            width: 0,
            marginTop: '70px'

            // maxHeight: '400px',
        },
        marginTop: '70px'
    },
    toolbar: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        padding: '0 8px',
        ...theme.mixins.toolbar,
    },
    content: {
        width: "100%",
        // height: "100%",
        minHeight: "100%",
        maxHeight: "100%",
    },
    nested: {
        backgroundColor: "#F4F4F4",
        borderRadius: "9px"
        // marginLeft: theme.spacing(9),
        // margin: "5px 0px",
        // '&:hover': {
        //     background: "none",
        //     color: "blue"
        // }
    },
    expandlessAndExpandMore: {
        // marginLeft: '30px',
    },
    menuHeaderSelected: {
        background: "#4680FF",
        boxShadow: "-2px 5px 4px rgba(0, 0, 0, 0.25);",
        borderRadius: "4px",
        color: "white",

        '&:hover': {

            background: "#4680FF",

            // color: "blue"
        }
    },
    userProfile: {
        width: theme.spacing(18),
        height: theme.spacing(18),
    },
    userProfile1: {
        width: '40PX',
        height: '40PX',
    },
    closeButton: {
        top: "10px",
        position: "absolute",
        right: "-12px",
        justifyContent: "center",
        textAlign: "center",
        // width: "23px",
        height: "150px",
        marginBottom: "10px",
        background: "#F1F1F1",
        opacity: "0.65",
        boxShadow: "0px 2px 10px rgba(69, 90, 100, 0.3)",
        borderRadius: "10px 5px 5px 10px",
        cursor: "pointer"
    },
    openButton: {
        position: "relative",
        left: "50px",
        top: "10px",
        // justifyContent: "center",
        // textAlign:"center"
        // position: "absolute",
        width: "23px",
        height: "50px",
        // left: "256px",
        // top: "137px",
        marginBottom: "10px",
        background: "#F1F1F1",
        opacity: "0.65",
        boxShadow: "0px 2px 10px rgba(69, 90, 100, 0.3)",
        borderRadius: "10px 5px 5px 10px",
        cursor: "pointer"


    },
    expondIcon: {
        right: "0px",
        position: "absolute"
    },
    headingOverride: {
        width: '150px',

    }

    // overrides: {
    //     MuiMenuItem: {
    //         root: {
    //             color: 'red !important'
    //         }
    //     }
    // }

    // copied from material ui


}));




function DrawerBar(props) {
    const { pathname, history } = props.location;
    const classes = useStyles();
    const theme = useTheme();
    const [open, setOpen] = React.useState(false);
    const [openTest, setOpenTest] = React.useState(false);
    const [openBasicInfo, setOpenBasicInfo] = React.useState(false);
    const [openFinance, setFinance] = React.useState(false);
    const [openStudentInfo, setOpenStudentInfo] = React.useState(false);
    const [openHrInfo, setOpenHrInfo] = React.useState(false);
    const [openLeaveInfo, setOpenLeaveInfo] = React.useState(false);
    const [openEnrollment, setEnrollment] = React.useState(false);
    const [openGeneral, setGeneral] = React.useState(false);
    const [openAdmin, setAdmin] = React.useState(false);

    function handleDrawerOpen() {
        setOpen(true);

        if (pathname.includes("basicdetails")) {
            setOpenBasicInfo(true)
        }
        else if (pathname.includes("studentdetails")) {
            setOpenStudentInfo(true)
        }
        else if (pathname.includes("finance")) {
            setFinance(true)
        }
        else if (pathname.includes("enrollment")) {
            setEnrollment(true)
        }
        else if (pathname.includes("hr")) {
            setOpenHrInfo(true)
        }
        else if (pathname.includes("leave")) {
            setOpenLeaveInfo(true)
        }
        else if (pathname.includes("general")) {
            setGeneral(true)
        }

        else if (pathname.includes("admin")) {
            setAdmin(true)
        }
    }

    function handleDrawerClose() {
        setOpen(false);
        setOpenBasicInfo(false)
        setOpenStudentInfo(false)
        setFinance(false)
        setEnrollment(false)
        setOpenHrInfo(false)
        setOpenLeaveInfo(false)
        setGeneral(false)
        setAdmin(false)

    }


    function handleOpenBasicInfo() {
        setOpenBasicInfo(!openBasicInfo)
        setOpen(true)
        setEnrollment(false)
        setFinance(false)
        setOpenStudentInfo(false)
        setOpenHrInfo(false)
    }

    function handleOpenEnrollment() {
        setEnrollment(!openEnrollment)
        setOpen(true)
        setOpenBasicInfo(false)
        setFinance(false)
        setOpenStudentInfo(false)
        setOpenHrInfo(false)
        setOpenLeaveInfo(false)
        setGeneral(false)


    }
    function handleOpenFinance() {
        setFinance(!openFinance)
        setOpen(true)
        setEnrollment(false)
        setOpenBasicInfo(false)
        setOpenStudentInfo(false)
        setOpenHrInfo(false)
        setOpenLeaveInfo(false)
        setGeneral(false)


    }

    function handleOpenStudentInfo() {

        setOpen(true)
        setOpenStudentInfo(!openStudentInfo)
        setEnrollment(false)
        setOpenBasicInfo(false)
        setFinance(false)
        setOpenHrInfo(false)
        setOpenLeaveInfo(false)
        setGeneral(false)

    }
    function handleOpenHrInfo() {

        setOpen(true)
        setOpenHrInfo(!openHrInfo)
        setEnrollment(false)
        setOpenBasicInfo(false)
        setFinance(false)
        setOpenLeaveInfo(false)
        setGeneral(false)


    }
    function handleOpenLeaveInfo() {

        setOpen(true)
        setOpenHrInfo(false)
        setEnrollment(false)
        setOpenBasicInfo(false)
        setFinance(false)
        setOpenLeaveInfo(!openLeaveInfo)
        setGeneral(false)
    }
    function handleGeneral() {

        setOpen(true)
        setOpenHrInfo(false)
        setEnrollment(false)
        setOpenBasicInfo(false)
        setFinance(false)
        setOpenLeaveInfo(false)
        setGeneral(!openGeneral)
    }
    function handleAdmin() {

        setOpen(true)
        setOpenHrInfo(false)
        setEnrollment(false)
        setOpenBasicInfo(false)
        setFinance(false)
        setOpenLeaveInfo(false)
        setGeneral(false)
        setAdmin(!openAdmin)
    }
    function logout() {
        localStorage.clear()
        window.location.pathname = '/login';
    }
    const staffDetails = JSON.parse(localStorage.getItem('user'));
    return (
        <div className={classes.root}>
            <CssBaseline />
            <AppBar
                position="fixed"
                className={clsx(classes.appBar, {
                    [classes.appBarShift]: open,
                })}
            >
                <Toolbar>
                    <IconButton
                        color="inherit"
                        aria-label="Open drawer"
                        onClick={handleDrawerOpen}
                        edge="start"
                        className={clsx(classes.menuButton, {
                            [classes.hide]: open,
                        })}
                    >
                        <MenuIcon />
                    </IconButton>

                    <IconButton
                        color="inherit"
                        aria-label="Open drawer"
                        onClick={handleDrawerClose}
                        edge="start"
                        className={clsx(classes.menuButton, {
                            [classes.hide]: !open,
                        })}
                    >
                        <ArrowBackIosIcon />
                    </IconButton>
                    <Box width='100%' display='flex' justifyContent='flex-end'>
                        <Button style={{
                            backgroundColor: 'red', color: 'white', fontSize: '13px', textTransform: 'none',
                            height: '25px',
                            padding: '1px',
                            borderRadius: '10px',
                            marginTop: '8px',
                            marginRight: '5px'
                        }}
                            onClick={logout}>
                            Logout

                    </Button>
                        <Box display="flex" justifyContent="center" >
                            <Avatar alt="Remy Sharp" src={user1} className={classes.userProfile1} />
                        </Box>
                    </Box>

                </Toolbar>
            </AppBar>

            <Drawer
                variant="permanent"
                className={clsx(classes.drawer, {
                    [classes.drawerOpen]: open,
                    [classes.drawerClose]: !open,
                })}
                classes={{
                    paper: clsx({
                        [classes.drawerOpen]: open,
                        [classes.drawerClose]: !open,
                    }),
                }}
                open={open}
            >

                <Box position="relative" mb={2}>
                    {
                        open ?
                            <Box className={classes.closeButton} boxShadow={4}
                                onClick={handleDrawerClose}
                            ><ArrowBackIosIcon
                                    style={{ marginTop: "60px", color: "#4680FF" }}

                                />
                            </Box>


                            :
                            <Box className={classes.openButton} boxShadow={4}
                                onClick={handleDrawerOpen}
                            >
                                <ArrowForwardIosIcon
                                    style={{ marginTop: "10px", color: "#4680FF" }}
                                />
                            </Box>
                    }

                </Box>

                {
                    open &&

                    <Box textAlign="center"  >

                        <Box display="flex" justifyContent="center" >
                            <Avatar alt="Remy Sharp" src={user} className={classes.userProfile} />
                        </Box>

                        <Box mt={3} style={{ textTransform: 'capitalize' }}>
                            <Typography variant="h6" noWrap={true}>

                                {staffDetails.username}
                            </Typography>
                        </Box>

                        <Box m={1}>
                            <FormLabel>


                            </FormLabel>
                        </Box>

                    </Box>
                }
                <ListItem button onClick={handleOpenBasicInfo}
                    className={pathname.includes("basicdetails") ? classes.menuHeaderSelected : ""} >

                    <DashboardOutlinedIcon />
                    {open &&
                        <>

                            <Box pl={2}>

                                <ListItemText>
                                    <Typography variant="h6" >
                                        Basic info
                                    </Typography>
                                </ListItemText>
                            </Box>


                            <Box className={classes.expondIcon} >
                                {openBasicInfo ? <ExpandLess className={classes.expandlessAndExpandMore} /> :
                                    <ExpandMore className={classes.expandlessAndExpandMore} />}
                            </Box>
                        </>
                    }
                </ListItem>


                {
                    openBasicInfo &&
                    <List>
                        <Box className={classes.nested} >

                            <Box>

                                <MenuItem component="div" component={Link} to="/basicdetails/school/view"
                                    className={pathname === "/basicdetails/school/view" ? "sublistSelected" : ""} >
                                    <ListItemText primary={"School Details"} />
                                </MenuItem>
                            </Box>
                            <Box>

                                <MenuItem component="div" component={Link} to="/basicdetails/academic/view"
                                    className={pathname === "/basicdetails/academic/view" ? "sublistSelected" : ""} >
                                    <ListItemText primary={"Academic Year"} />
                                </MenuItem>
                            </Box>
                            <Box>

                                <MenuItem component="div" component={Link} to="/basicdetails/financial/view"
                                    className={pathname === "/basicdetails/financial/view" ? "sublistSelected" : ""} >
                                    <ListItemText primary={"Financial Year"} />
                                </MenuItem>
                            </Box>
                            <Box>

                                <MenuItem component="div" component={Link} to="/basicdetails/standards/view"
                                    className={pathname === "/basicdetails/standards/view" ? "sublistSelected" : ""} >
                                    <ListItemText primary={"Standards"} />
                                </MenuItem>
                            </Box>
                            <Box>

                                <MenuItem component="div" component={Link} to="/basicdetails/sections/view"
                                    className={pathname === "/basicdetails/sections/view" ? "sublistSelected" : ""} >
                                    <ListItemText primary={"Sections"} />
                                </MenuItem>
                            </Box>
                            <Box>

                                <MenuItem component="div" component={Link} to="/basicdetails/strengths/view"
                                    className={pathname === "/basicdetails/strengths/view" ? "sublistSelected" : ""} >
                                    <ListItemText primary={"Standard Strength"} />
                                </MenuItem>
                            </Box>
                            <Box>

                                <MenuItem component="div" component={Link} to="/basicdetails/subjects/view"
                                    className={pathname === "/basicdetails/subjects/view" ? "sublistSelected" : ""} >
                                    <ListItemText primary={"Subjects"} />
                                </MenuItem>
                            </Box>

                        </Box>
                    </List>
                }

                {
                    !open &&

                    <Box pt={1} />
                }


                <ListItem button onClick={handleOpenStudentInfo}
                    className={pathname.includes("studentdetails") ? classes.menuHeaderSelected : ""} >
                    <SchoolOutlinedIcon />
                    {open &&
                        <>
                            <Box pl={2}>

                                <ListItemText  >

                                    <Typography variant="h6" >

                                        Student Forms
                        </Typography>
                                </ListItemText>
                            </Box>

                            <Box className={classes.expondIcon} >
                                {openStudentInfo ? <ExpandLess className={classes.expandlessAndExpandMore} /> :
                                    <ExpandMore className={classes.expandlessAndExpandMore} />}
                            </Box>
                        </>
                    }
                </ListItem>

                {
                    openStudentInfo &&
                    <List>
                        <Box className={classes.nested} >

                            <MenuItem component="div" component={Link} to="/studentdetails/enquiry/list"
                                className={pathname == "/studentdetails/enquiry/list" ? "sublistSelected" : ""}
                            >
                                <ListItemText primary={"   Enquiry Student List"} />


                            </MenuItem>
                            <MenuItem component="div" component={Link} to="/studentdetails/application/list"
                                className={pathname == "/studentdetails/application/list" ? "sublistSelected" : ""}
                            >

                                <ListItemText primary={"  Application Student List"} />

                            </MenuItem>
                            <MenuItem component="div" component={Link} to="/studentdetails/admission/list"
                                className={pathname == "/studentdetails/admission/list" ? "sublistSelected" : ""}
                            >
                                <ListItemText primary={" Admission Student List"} />


                            </MenuItem>
                        </Box>
                    </List>
                }
                {
                    !open &&

                    <Box pt={1} />
                }



                <ListItem button onClick={handleOpenFinance}
                    className={pathname.includes("finance") ? classes.menuHeaderSelected : ""}>
                    <PeopleAltOutlinedIcon />
                    {open &&
                        <>
                            <Box pl={2}>

                                <ListItemText  >
                                    <Typography variant="h6" >

                                        Finance
                        </Typography>
                                </ListItemText>
                            </Box>
                            <Box className={classes.expondIcon} >

                                {openFinance ? <ExpandLess className={classes.expandlessAndExpandMore} /> :
                                    <ExpandMore className={classes.expandlessAndExpandMore} />}
                            </Box>
                        </>
                    }
                </ListItem>
                {
                    openFinance &&
                    <List>
                        <Box className={classes.nested} >
                            <MenuItem component="div" component={Link} to="/finance/application-fees/view"
                                className={pathname.includes("application-fees") ? "sublistSelected" : ""}
                            >
                                <ListItemText primary={"Application Fees"} />
                            </MenuItem>
                            <MenuItem component="div" component={Link} to="/finance/addfeestype"
                                className={pathname.includes("addfeestype") ? "sublistSelected" : ""}
                            >
                                <ListItemText primary={" Add Fee type"} />


                            </MenuItem>
                            <MenuItem component="div" component={Link} to="/finance/feestypes"
                                className={pathname.includes("feestypes") ? "sublistSelected" : ""}
                            >
                                <ListItemText primary={"View Fees Types"} />


                            </MenuItem>
                            {/* <MenuItem component="div" component={Link} to="/finance/createfeestype/:yearid/:standardids"
                                className={pathname.includes("createfeestype") ? "sublistSelected" : ""}
                            >
                                <ListItemText primary={" Create Fee type"} />


                            </MenuItem> */}

                            <MenuItem component="div" component={Link} to="/finance/feesplan/view"
                                className={pathname.includes("feesplan") ? "sublistSelected" : ""}
                            >
                                <ListItemText primary={"  Fee Plan"} />


                            </MenuItem>
                            <MenuItem component="div" component={Link} to="/finance/feescollection"
                                className={pathname.includes("feescollection") ? "sublistSelected" : ""}
                            >
                                <ListItemText primary={"  Fee Collection"} />


                            </MenuItem>

                        </Box>
                    </List>
                }

                {
                    !open &&

                    <Box pt={1} />
                }


                <ListItem button onClick={handleOpenEnrollment}
                    className={pathname.includes("enrollment") ? classes.menuHeaderSelected : ""} >


                    <SchoolOutlinedIcon />
                    {open &&
                        <>
                            <Box pl={2}>

                                <ListItemText  >
                                    <Typography variant="h6" >

                                        Enrollment
                        </Typography>
                                </ListItemText>
                            </Box>

                            <Box className={classes.expondIcon} >

                                {openEnrollment ? <ExpandLess className={classes.expandlessAndExpandMore} /> :
                                    <ExpandMore className={classes.expandlessAndExpandMore} />}
                            </Box>
                        </>
                    }
                </ListItem>


                {
                    openEnrollment &&
                    <List>
                        <Box className={classes.nested} >

                                <MenuItem component="div" component={Link} to="/enrollment/assignsubjects"
                                    className={pathname == "/enrollment/assignsubjects" ? "sublistSelected" : ""}
                                >
                                    <ListItemText primary={" Assign Subjects"} />


                            </MenuItem>

                                <MenuItem component="div" component={Link} to="/enrollment/fastenrollment"
                                    className={pathname == "/enrollment/fastenrollment" ? "sublistSelected" : ""}
                                >
                                    <ListItemText primary={"Fast Enrollment"} />


                                </MenuItem>
                                <MenuItem component="div" component={Link} to="/enrollment/promotestudent"
                                    className={pathname == "/enrollment/promotestudent" ? "sublistSelected" : ""}
                                >
                                    <ListItemText primary={"  Promote Student"} />

                                </MenuItem>
                                <MenuItem component="div" component={Link} to="/enrollment/shufflestudent"
                                    className={pathname == "/enrollment/shufflestudent" ? "sublistSelected" : ""}
                                >
                                    <ListItemText primary={"   Shuffle Student"} />

                            </MenuItem>
                        </Box>
                    </List>
                }


                {
                    !open &&

                    <Box pt={1} />
                }


                <ListItem button onClick={handleOpenHrInfo}
                    className={pathname.includes("hr") ? classes.menuHeaderSelected : ""} >
                    <SchoolOutlinedIcon />
                    {open &&
                        <>
                            <Box pl={2}>

                                <ListItemText  >

                                    <Typography variant="h6" >

                                        HR Management
                    </Typography>
                                </ListItemText>
                            </Box>

                            <Box className={classes.expondIcon} >
                                {openHrInfo ? <ExpandLess className={classes.expandlessAndExpandMore} /> :
                                    <ExpandMore className={classes.expandlessAndExpandMore} />}
                            </Box>
                        </>
                    }
                </ListItem>

                {
                    openHrInfo &&
                    <List>
                        <Box className={classes.nested} >

                            <MenuItem component="div" component={Link} to="/hr/staff/list"
                                className={pathname === "/hr/staff/list" ? "sublistSelected" : ""}
                            >
                                <ListItemText primary={" Staffs"} />


                            </MenuItem>
                            <MenuItem component="div" component={Link} to="/hr/shifts/view"
                                className={pathname === "/hr/shifts/view" ? "sublistSelected" : ""}
                            >
                                <ListItemText primary={" Manage Shift Types"} />


                            </MenuItem>
                            <MenuItem component="div" component={Link} to="/hr/assign/shift-view"
                                className={pathname === "/hr/assign/shift-view" ? "sublistSelected" : ""}
                            >
                                <ListItemText primary={" Assign Shift"} />


                            </MenuItem>
                            <MenuItem component="div" component={Link} to="/hr/assignsubject/view"
                                className={pathname === "/hr/assignsubject/view" ? "sublistSelected" : ""}
                            >
                                <ListItemText primary={" Assign Subject"} />


                            </MenuItem>
                            <MenuItem component="div" component={Link} to="/hr/staff/attendance/view"
                                className={pathname === "/hr/staff/attendance/view" ? "sublistSelected" : ""}
                            >
                                <ListItemText primary={" Manage Staff Attendance"} />


                            </MenuItem>
                        </Box>
                    </List>
                }
                {
                    !open &&

                    <Box pt={1} />
                }






                <ListItem button onClick={handleOpenLeaveInfo}
                    className={pathname.includes("leave") ? classes.menuHeaderSelected : ""} >
                    <SchoolOutlinedIcon />
                    {open &&
                        <>
                            <Box pl={2}>

                                <ListItemText  >

                                    <Typography variant="h6" className={classes.headingOverride}>

                                        Leave Management
                    </Typography>
                                </ListItemText>
                            </Box>

                            <Box className={classes.expondIcon} >
                                {openLeaveInfo ? <ExpandLess className={classes.expandlessAndExpandMore} /> :
                                    <ExpandMore className={classes.expandlessAndExpandMore} />}
                            </Box>
                        </>
                    }
                </ListItem>

                {
                    openLeaveInfo &&
                    <List>

                        <Box className={classes.nested} >

                            <MenuItem component="div" component={Link} to="/leave/view"
                                className={pathname === "/leave/view" ? "sublistSelected" : ""}
                            >
                                <ListItemText primary={" Manage Leave Types"} />


                            </MenuItem>
                            <MenuItem component="div" component={Link} to="/leave/plan"
                                className={pathname === "/leave/plan" ? "sublistSelected" : ""}
                            >
                                <ListItemText primary={" Manage Leave plan"} />


                            </MenuItem>

                            <MenuItem component="div" component={Link} to="/leave/application"
                                className={pathname === "/leave/application" ? "sublistSelected" : ""}
                            >
                                <ListItemText primary={" Apply Leave application"} />


                            </MenuItem>
                            <MenuItem component="div" component={Link} to="/leave/approvalapplication"
                                className={pathname === "/leave/approvalapplication" ? "sublistSelected" : ""}
                            >
                                <ListItemText primary={"Approval Leave application"} />


                            </MenuItem>

                        </Box>
                    </List>
                }
                {
                    !open &&

                    <Box pt={1} />
                }



                <ListItem button onClick={handleGeneral}
                    className={pathname.includes("general") ? classes.menuHeaderSelected : ""} >
                    <SchoolOutlinedIcon />
                    {open &&
                        <>
                            <Box pl={2}>

                                <ListItemText  >

                                    <Typography variant="h6" >

                                        General
                    </Typography>
                                </ListItemText>
                            </Box>

                            <Box className={classes.expondIcon} >
                                {openGeneral ? <ExpandLess className={classes.expandlessAndExpandMore} /> :
                                    <ExpandMore className={classes.expandlessAndExpandMore} />}
                            </Box>
                        </>
                    }
                </ListItem>

                {
                    openGeneral &&
                    <List>

                        <Box className={classes.nested} >
                            <MenuItem component="div" component={Link} to="/general/holiday-calender/view"
                                className={pathname === "/general/holiday-calender/view" ? "sublistSelected" : ""}
                            >
                                <ListItemText primary={" Manage Holiday Calender"} />


                            </MenuItem>
                            <MenuItem component="div" component={Link} to="/general/event-type/view"
                                className={pathname === "/general/event-type/view" ? "sublistSelected" : ""}
                            >
                                <ListItemText primary={" Manage Events Types"} />

 
                            </MenuItem>
                            <MenuItem component="div" component={Link} to="/general/event/list"
                                className={pathname === "/general/event/list" ? "sublistSelected" : ""}
                            >
                                <ListItemText primary={" Manage Events"} />

 
                            </MenuItem>
                            <MenuItem component="div" component={Link} to="/general/country/view"
                                className={pathname === "/general/country/view" ? "sublistSelected" : ""}
                            >
                                <ListItemText primary={" Manage Countries"} />


                            </MenuItem>
                            <MenuItem component="div" component={Link} to="/timetable/assigntimetable"
                                className={pathname === "/timetable/assigntimetable" ? "sublistSelected" : ""}
                            >
                                <ListItemText primary={"Assign Timetable"} />


                            </MenuItem>
                            <MenuItem component="div" component={Link} to="/general/state/view"
                                className={pathname === "/general/state/view" ? "sublistSelected" : ""}
                            >
                                <ListItemText primary={" Manage States"} />


                            </MenuItem>

                            <MenuItem component="div" component={Link} to="/general/district/view"
                                className={pathname === "/general/district/view" ? "sublistSelected" : ""}
                            >
                                <ListItemText primary={" Manage Districts"} />


                            </MenuItem>

                            <MenuItem component="div" component={Link} to="/general/city/view"
                                className={pathname === "/general/city/view" ? "sublistSelected" : ""}
                            >
                                <ListItemText primary={" Manage Cities"} />


                            </MenuItem>



                        </Box>
                    </List>
                }
                {
                    open &&

                    <Box mb={10} />
                }
            </Drawer>
            <main className={classes.content}>
                <div>


                    <div className="DrawerChildren">
                        {props.children}

                    </div>
                </div>

                {/* <i className="fa fa-rocket fa-lg" aria-hidden="true"></i> */}

            </main>
        </div>

    );
}



export default withRouter(DrawerBar)