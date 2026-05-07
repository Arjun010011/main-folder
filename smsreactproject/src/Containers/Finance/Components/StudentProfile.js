import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Box from '@material-ui/core/Box';
import { Paper, Grid } from '@material-ui/core';
import Divider from '@material-ui/core/Divider';
import logo from './st.jpg'
import { relative } from 'path';
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
    fontsize: {
        fontSize: 12,
    },
    shadow: {
        boxShadow: "0 4px 8px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.19)",

    }

});
function Studentinfo(props) {
    //const {first_name,middle_name,last_name,dob,gender,email,current_reg_num,mobile_num} = props.student;
    const { studentDetails } = props

    const classes = useStyles();
    return (
        <div className={classes.textfam}>


            <Paper style={{ position: relative }} >
                <Box mt={8} className={classes.shadow}>
                    <Grid container spacing={1}>
                        <Grid item xs={12} >

                            <Box display="flex" justifyContent="center" alignItems="center">
                                <img src={logo} className={classes.roundimage + " " + classes.shadow} />
                                {/* <img src={Logo}  className="roundimage shadow" /> */}

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
                                    {studentDetails.email}
                                </Box>
                            </Grid>
                        </Grid>
                    </Box>
                    <Box pl={2} pr={2}>
                        <Divider variant="middle" />
                    </Box>
                    <Grid container spacing={1}>
                        <Grid item md={6} xs={12}>
                            <Box textAlign="center" mb={-2}>
                                <h4>Register Number
                                    </h4>
                            </Box>
                            <Box className={classes.fontsize} color="Gray" display="flex" justifyContent="center" alignItems="center">
                                {studentDetails.current_reg_num}
                            </Box>
                        </Grid>
                        <Grid item md={6} xs={12}>
                            <Box textAlign="center" mb={-2}>

                                <h4>Phone Number
                                        </h4>
                            </Box>
                            <Box className={classes.fontsize} color="Gray" display="flex" justifyContent="center" alignItems="center">
                                {studentDetails.mobile_num}
                            </Box>
                        </Grid>
                    </Grid>
                    <Grid container spacing={1}>
                        <Grid item md={6} xs={12}>
                            <Box textAlign="center" mb={-2}>
                                <h4>Standard
                                        </h4>
                            </Box>
                            <Box className={classes.fontsize} color="Gray" display="flex" justifyContent="center" alignItems="center">
                                {studentDetails.current_standard}
                            </Box>
                        </Grid>
                        <Grid item md={6} xs={12}>
                            <Box textAlign="center" mb={-2}>
                                <h4>DOB
                                    </h4>
                            </Box>
                            <Box className={classes.fontsize} color="Gray" display="flex" justifyContent="center" alignItems="center" pb={5}>
                                {studentDetails.dob}
                            </Box>
                        </Grid>
                    </Grid>
                </Box>
            </Paper>



        </div>

    )
}
export default Studentinfo





