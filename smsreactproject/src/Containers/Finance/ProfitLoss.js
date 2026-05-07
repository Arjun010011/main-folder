import React, { Component } from 'react'
import { getRequest } from "Includes/api/apicall";
import { GET_URL } from "Includes/urls";
import { DateRange } from "Components/DateRange";
import { Grid, Paper, Box } from "@material-ui/core/";
import moment from "moment";
import TrendingUpIcon from '@material-ui/icons/TrendingUp';
import BlankPagewithIcon from "Components/BlankPageWithIcon/index";
import TrendingDownIcon from '@material-ui/icons/TrendingDown';
import { numberWithCommas } from 'Includes/functions';

export default class ProfitLoss extends Component {
    constructor(props){
        super(props)
        this.state ={
            minDate: "",
            maxDate: "",
            dateRangeValue: null,
            collection: 0,
            expense: 0,
            total: 0,
            blankPageMessage: ''
        }
    }

    handleChangeDateRange = (dateRangeValue) => {
        this.setState({ dateRangeValue }, () => {
          this.getProfitLoss();
        });
    };

    getProfitLoss = () =>{
        const {dateRangeValue} = this.state
        let params = {}
        if (dateRangeValue && dateRangeValue.start && dateRangeValue.end) {
            params.from_date = moment(dateRangeValue.start).format("YYYY-MM-DD");
            params.to_date = moment(dateRangeValue.end).format("YYYY-MM-DD");
            getRequest(GET_URL.balance.api, params, this.props).then((response) => {
                if (response && response.status === 200) {
                    this.setState({
                        collection: response.data.data['collection'],
                        expense: response.data.data['expense'],
                        total: response.data.data['total'],
                    })
                }
            });
        }
    }

    render() {
        let {minDate, maxDate,dateRangeValue, collection, expense, blankPageMessage} = this.state
        if(dateRangeValue == null || dateRangeValue == ''){
            blankPageMessage = 'Please select Date Range';
        }
        return (
            <Paper className={"paper-background"}>
                    <Grid container>
                        <Grid item md={12} xs={12} sm={12}>
                            <Box display='flex' justifyContent='space-between'>
                                <Box className="header-align">
                                    <Box className="heading">Profit And Loss</Box>
                                </Box>
                            </Box>
                        </Grid>
                    </Grid>
                    <DateRange
                        handleChange={this.handleChangeDateRange}
                        minDate={minDate}
                        maxDate={maxDate}
                    />
                    {blankPageMessage === ''  ? 
                        <>
                            <Box display='flex'>
                                <div className='profit-card profit-loss-card'>
                                    <Box display='flex' justifyContent='space-around'> 
                                        <div className='profit-loss-icon'>
                                            <TrendingUpIcon style={{lineHeight: '0px', color:'#614EA6'}}/>
                                        </div>
                                        <div style={{marginLeft: '20px',marginRight: '20px'}}>
                                            <div className='profit-loss-heading'>
                                                Profit
                                            </div>
                                            <div className='profit-loss-amount'>
                                                {((collection-expense) > 0 ? numberWithCommas(collection-expense) : 0)}
                                            </div> 
                                        </div>
                                    </Box>
                                    <div className='profit-loss-footer-text'>
                                        Total collection: {collection}
                                    </div>
                                </div>

                                <div className='profit-card profit-loss-card'>
                                    <Box display='flex' justifyContent='space-around'> 
                                        <div className='profit-loss-icon'>
                                            <TrendingDownIcon style={{lineHeight: '0px', color:'#614EA6'}}/>
                                        </div>
                                        <div style={{marginLeft: '20px',marginRight: '20px'}}>
                                            <div className='profit-loss-heading'>
                                                Loss
                                            </div>
                                            <div className='profit-loss-amount'>
                                                {((expense-collection) > 0 ? numberWithCommas(expense-collection): 0)}
                                            </div> 
                                        </div>
                                    </Box>
                                    <div className='profit-loss-footer-text'>
                                        Total Expense: {expense}
                                    </div>
                                </div>
                            </Box>
                        </> :
                        <Box mt={3}>
                            <BlankPagewithIcon data={blankPageMessage} />
                        </Box>
                    }
                </Paper>
        )
    }
}
