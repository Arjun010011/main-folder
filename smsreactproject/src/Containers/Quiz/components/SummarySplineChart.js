


import React from 'react';
import { checkAuthentication } from 'Includes/functions';
// import "font-awesome/css/font-awesome.css";
var Highcharts = require('highcharts')
class SummarySplineChart extends React.Component {
    constructor(props) {
        super(props);
    }
    getChartData = () => {
        const { chartDetails } = this.props;
        new Highcharts.chart('container', {
            chart: {
                type: 'spline'
            },
            title: {
                text: 'Monthly Average Scored Points'
            },
            xAxis: {
                categories: chartDetails.monthList
            },
            yAxis: {
                title: {
                    text: 'Percentage'
                },
                labels: {
                    formatter: function () {
                        return this.value + '%';
                    }
                }
            },
            tooltip: {
                crosshairs: true,
                shared: true
            },
            plotOptions: {
                spline: {
                    marker: {
                        radius: 4,
                        lineColor: '#666666',
                        lineWidth: 1
                    }
                }
            },
            series: [{
                name: 'Score Average',
                marker: {
                    symbol: 'square'
                },
                data: chartDetails.pointList
            }]
        });
    }
    componentDidMount() {
        this.getChartData();
    }

    render() {
        return (
            <figure class="highcharts-figure">
                <div id="container"></div>
                <p class="highcharts-description">
                </p>
            </figure>

        );
    }
}

export default (SummarySplineChart);