import React, { Component } from 'react'
import { Box } from '@material-ui/core';

const today = new Date();
const date = today.getDate();
const month = today.getMonth();
const year = today.getFullYear();
const fromDate = date + '-' + (month + 1) + '-' + year
const ToDate = (date + 7) + '-' + (month + 1) + '-' + year
export default class HrAssignShiftCalenderView extends Component {
    constructor(props) {
        super(props)

        this.state = {
            from: fromDate,
            to: ToDate,
            days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
            dateAndDay: [],
        }
    }


    componentDidMount() {

        this.updateCalender(this.state.from, this.state.to);

    }
    updateCalender(from, to) {
        let fromDate = []
        let toDate = []
        fromDate = from.split('-')
        toDate = to.split('-')
        let daysOfYear = []
        let temp = {}
        for (var d = new Date(fromDate[2], (fromDate[1] - 1), fromDate[0]); d <= new Date(toDate[2], (toDate[1] - 1), toDate[0]); d.setDate(d.getDate() + 1)) {
            temp.date = d.getDate()
            temp.day = this.state.days[d.getDay()]
            daysOfYear.push({ ...temp })
        }
        this.setState({
            dateAndDay: daysOfYear
        })
    }
    render() {
        const { dateAndDay } = this.state
        return (
            <div>
                <table style={{ width: '100%', textAlign: 'left' }}>
                    <tr>
                        <th></th>
                        {dateAndDay.map((data) => {
                            return (
                                <th>
                                    <Box>
                                        {data.day}
                                    </Box>
                                    <Box>
                                        {data.date}
                                    </Box>
                                </th>
                            )
                        })
                        }
                    </tr>
                </table>
            </div>
        )
    }
}
