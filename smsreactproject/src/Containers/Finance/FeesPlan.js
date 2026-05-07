import React, { Component } from 'react';
import { withRouter } from 'react-router-dom';
import { Grid, FormLabel, Paper, Box, Button, TextField, Typography } from '@material-ui/core';
import Swal from 'sweetalert2';
import { withStyles } from '@material-ui/core/styles';

import { BUTTONCOLOR, GREENGRAIENTBUTTON } from 'Constants/styleVariable';
import LoadingGif from 'Components/LoadingGif';
import { getRequest, postRequest } from 'Includes/api/apicall';
import { GET_URL, POST_URL } from 'Includes/urls';
import { Actions } from 'Constants/permissions';

const Styles = theme => ({
    submitButton: {
        padding: "10px 20px",
        background: GREENGRAIENTBUTTON,
        color: "white",
        fontWeight: "bold"
    },
    heading: {
        fontFamily: "Roboto",
        fontStyle: "normal",
        fontWeight: "normal",
        fontSize: "20px",
        marginLeft: "30px",
        lineHeight: "44px",
        letterSpacing: "0.15px",
        color: "#000000",
    },
    selectFeeTerm: {
        fontFamily: "Roboto",
        fontStyle: "normal",
        fontWeight: "bold",
        fontSize: "20px",
        letterSpacing: "0.15px",
        color: "#000000",
    },
    boxHeading: {
        fontFamily: "Roboto",
        fontStyle: "normal",
        fontWeight: "bold",
        fontSize: "35px",
        letterSpacing: "0.15px",
        color: "#5A5A5A",
    },
    termName: {
        fontFamily: "Roboto",
        fontStyle: "normal",
        fontWeight: "bold",
        fontSize: "25px",
        letterSpacing: "0.15px",
        lineHeight: "57px"
    }
});
let balanceTest = {};

class FessPlan extends Component {
    constructor() {
        super()
        this.state = {
            yearList: [],
            loading: true,
            standardList: [],
            year: 0,
            standard: 0,
            feePlan: []
        }
    }

    onChange = (e) => {
        let name = e.target.name;
        let value = e.target.value;
        if (name === "standard" && this.state.year === 0) {
            alert("Please select Academic year")
        }
        else if (value !== 0) {
            this.setState({ [name]: value })
        }
    }

    async componentDidMount() {
        const { year, standard } = this.props.match.params;
        this.getFeePlan(year, standard);
    }

    getFeePlan = (year, standard) => {
        let params = { academic_year: year, standard: standard };
        getRequest(GET_URL.feeplan.api, params, this.props).then((response) => {
            if (response && response.status === 200) {
                let feePlan = response.data.data.plan;
                for (const planIndex in feePlan) {
                    if (feePlan[planIndex].standard_fee.length === 0) {
                        let amount = feePlan[planIndex].amount;
                        let newTerm = {
                            terms: 'Term1',
                            amount: amount
                        }
                        feePlan[planIndex].standard_fee.push(newTerm)
                    }
                }
                this.setState({ feePlan, loading: false });
            }
        });
    }
    addterm = (index, e) => {
        e.preventDefault();
        let data = this.state.feePlan;
        let newTerm = {
            terms: `Term${data[index].standard_fee.length + 1}`,
            amount: 0,
        }
        data[index].standard_fee.push(newTerm)
        this.setState({ feePlan: data });
    }

    deleteTerm = (index, e) => {
        e.preventDefault();
        let data = this.state.feePlan;
        data[index].standard_fee.pop()
        this.setState({
            feePlan: data
        })

    }

    onChangeTerm = (amount, index, tIndex, e) => {
        e.preventDefault();
        let value = e.target.value;
        let data = this.state.feePlan;
        if (value > amount) {
            alert("please enter amount less than total mount")
        }
        else if (value < 0) {
            alert("negative not allowed")
        }
        else {
            let oldvalue = data[index].standard_fee[tIndex].amount
            data[index].standard_fee[tIndex].amount = value
            let standard_fee = data[index].standard_fee
            let sum = 0;
            for (let fee of standard_fee) {
                if (fee.amount !== "")
                    sum = parseInt(sum) + parseInt(fee.amount)
            }

            if (sum > amount) {
                alert(`your Exceeding ${amount}`)
                data[index].standard_fee[tIndex].amount = oldvalue
            }
            else {
                this.setState({
                    feePlan: data
                })
            }
        }
    }

    saveData = async () => {
        let data = this.state.feePlan;

        let result = data.some((data) => {
            let result = data.standard_fee.some((temp) => {
                return temp.amount === 0 || temp.amount === ""
            });
            return result
        });

        let balance = true;
        for (let bal in balanceTest) {
            if (!balanceTest[bal])
                balance = false;
        }
        if (result) {
            alert("Please fill all the Terms")
        }
        else if (!balance) {
            alert("Please make balance 0")
        }
        else {
            // let data = await post("finance/feeplan", this.state.feePlan)

            const url = POST_URL.feeplan.api;
            postRequest(url, this.state.feePlan, this.props).then((response) => {
                if (response && response.status === 200) {
                    Swal.fire({
                        position: 'top-end',
                        type: 'success',
                        title: 'Your Data has been saved',
                        showConfirmButton: false,
                        timer: 1500
                    })
                    this.props.history.push(Actions.fee_term.view.url)
                }
            });
        }
    }

    render() {
        // const { detail } = this.props.location.state;
        const { feePlan, loading } = this.state;
        const { classes } = this.props
        if (loading)
            return <LoadingGif />
        return (
            <>
                <Paper className={"background"}>
                    <Box p={6}>
                        <Grid container spacing={4}>
                            <Grid item md={8} xs={12}>
                                <Box>
                                    <Box mt={1} >
                                        <Typography variant="h5" color="primary">
                                            Create Fees Plan
                                        </Typography>
                                    </Box>
                                    <Box mt={2}>
                                        <FormLabel>
                                            You can create fee plan of your
                                            Create Fee plan
                                        </FormLabel>
                                    </Box>
                                </Box>
                            </Grid>
                            <Grid item md={2}>

                            </Grid>
                            <Grid item>
                                <Button className="previous-but"
                                    onClick={() => this.props.history.push(Actions.fee_term.view.url)}
                                >
                                    Previous
                                </Button>
                            </Grid>


                        </Grid>
                    </Box>
                    <Box pl={5} pb={3} className={classes.heading}>
                        {/* The Following result will be based on Academic Year {detail.year}
                        for the standard {detail.standard} */}
                    </Box>
                    <Box pl={9}>
                        {/* {feePlan.length > 0 && <Box className={classes.selectFeeTerm} mb={2} >Select fee Term</Box>} */}
                        {feePlan.map(({ id, fee_type_name, amount, standard_fee }, index) => {
                            let sum = 0;
                            for (let fee of standard_fee) {
                                if (fee.amount !== "")
                                    sum = parseInt(sum) + parseInt(fee.amount)
                            }
                            let balance = amount - sum;
                            if (balance !== 0) {
                                balanceTest[fee_type_name] = false
                            }
                            else {
                                balanceTest[fee_type_name] = true
                            }
                            return (
                                <Box p={5} key={id} boxShadow={3} mb={3}>
                                    <Box
                                        className={classes.boxHeading}
                                    > {fee_type_name}:{amount}  </Box>
                                    <Grid >
                                        {standard_fee.map((tdata, tIndex) => {
                                            return (
                                                <Box p={4} mt={3} key={tIndex}>
                                                    <Grid item>
                                                        <FormLabel className={classes.termName}>{tdata.terms}</FormLabel>
                                                        <TextField
                                                            variant="outlined"
                                                            id="outlined-number"
                                                            inputProps={{ style: { textAlign: 'center' } }}
                                                            onChange={(e) => this.onChangeTerm(amount, index, tIndex, e)}
                                                            value={tdata.amount}
                                                            style={{ marginLeft: "30px" }}
                                                        />
                                                        {(standard_fee.length === tIndex + 1 && tIndex !== 0) &&
                                                            <Button size="small" style={{ marginLeft: "40px", background: BUTTONCOLOR, color: "white" }}
                                                                variant="contained"
                                                                onClick={(e) => this.deleteTerm(index, e)}
                                                            >Delete Term</Button>}
                                                    </Grid>
                                                </Box>
                                            )
                                        })}
                                        {standard_fee.length !== 12 &&
                                            <Button size="small" style={{ marginLeft: "40px", marginTop: "10px", background: BUTTONCOLOR, color: "white" }} variant="contained"
                                                onClick={(e) => this.addterm(index, e)}
                                            >Add Term{standard_fee.length + 1}</Button>
                                        }
                                    </Grid>
                                </Box>
                            )
                        })}
                        {feePlan.length > 0 &&
                            <Box style={{ textAlign: "right" }} pb={4} pr={2}>
                                <Button variant="contained" size="large"
                                    className={classes.submitButton}
                                    onClick={this.saveData}>
                                    Submit Data
                            </Button>
                            </Box>
                        }
                    </Box>
                </Paper>

            </>
        )
    }
}



export default withRouter(withStyles(Styles)(FessPlan))
