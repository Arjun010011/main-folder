import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Box from '@material-ui/core/Box';
import { Paper, Grid } from '@material-ui/core';
import logo from 'images/./st.jpg'
import { relative } from 'path';
import profile_Background from 'images/profile_background.png'
const useStyles = makeStyles({
    custom_card: {
        maxWidth: 345,
    },
    roundimage: {
        borderRadius: "50%",
        width: 130,
        height: 140,
        position: "absolute",
    },
    textfam: {
        fontFamily: "Black, Gadget, sans - serif",
    },
    headerFont: {
        fontSize: 15,
        fontWeight: "bold"
    },
    fontsize: {
        fontSize: 15,
        marginLeft: 5
    },
    shadow: {
        boxShadow: "0 4px 8px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.19)",
    },
    coverImage: {
        minHeight: "60px",
        background: `url(${profile_Background})`,
        backgroundSize: "100%",
        height: "100%"
    },
    profileBackground: {
        width: "100%",
        height: "80%"
    },
    studentDetails: {
        display: 'flex',
        justifyContent: "center"
    }

});
function getDataSubscript(date) {
    switch (date) {
        case "1": return "st";
        case "2": return "nd";
        case "3": return "rd";
        default: return "th";
    }
}
function Studentinfo(props) {
    const { studentDetails } = props
    const classes = useStyles();
    return (
        <div className={classes.textfam}>
            <Paper style={{ position: relative }} >
                <Box>
                    <img src={profile_Background} className={classes.profileBackground} alt='profile_Background' />
                </Box>
                <Box className={classes.shadow}>
                    <Grid container spacing={1}>
                        <Grid item xs={12} >
                            <Box display="flex" justifyContent="center" alignItems="center">
                                <img src={logo} className={classes.roundimage + " " + classes.shadow} />
                            </Box>
                        </Grid>
                    </Grid>
                    <Box mt={2}>
                        <Grid container spacing={1}>
                            <Grid item xs={12}>
                                <Box textAlign="center" mt={7} mb={-2} >
                                    <h2>{studentDetails.name}</h2>
                                </Box>
                                <Box className={classes.fontsize} color="Gray" display="flex" justifyContent="center" alignItems="center" mb={2}>
                                    {studentDetails.standard}{getDataSubscript(studentDetails.standard)} Standard
                                </Box>
                            </Grid>
                        </Grid>
                    </Box>
                    {/* <Box pl={2} pr={2}>
                        <Divider variant="middle" />
                    </Box> */}
                    <Grid container spacing={1}>
                        {studentDetails.current_reg_num &&
                            <Grid item md={12} xs={12} className={classes.studentDetails}>
                                <Box className={classes.headerFont} textAlign="center">
                                    Register Number:
                                </Box>
                                <Box className={classes.fontsize} color="Gray">
                                    {studentDetails.current_reg_num}
                                </Box>
                            </Grid>
                        }
                        {studentDetails.mobile_num &&
                            <Grid item md={12} xs={12} className={classes.studentDetails}>
                                <Box className={classes.headerFont} textAlign="center">
                                    Phone Number:
                                </Box>
                                <Box className={classes.fontsize} color="Gray">
                                    {studentDetails.mobile_num}
                                </Box>
                            </Grid>
                        }
                        {studentDetails.dob &&
                            <Grid item md={12} xs={12} className={classes.studentDetails}>
                                <Box className={classes.headerFont} textAlign="center">
                                    DOB:
                                </Box>
                                <Box className={classes.fontsize} color="Gray" pb={5}>
                                    {studentDetails.dob}
                                </Box>
                            </Grid>
                        }
                    </Grid>
                </Box>
            </Paper>
        </div>
    )
}
export default Studentinfo