import React from 'react';
import { BrowserRouter as Router, Route, Switch, Redirect, withRouter } from 'react-router-dom'
import { checkAuthentication } from 'Includes/functions';
// import "font-awesome/css/font-awesome.css";
var Highcharts = require('highcharts')
class CommonComponent extends React.Component { 
  constructor(props){
    super(props);
  }
  getChartData = () => {
    const { standards_chart_data } = this.props;
    let seriesData = []
    if(standards_chart_data.chartData.length > 0){
      seriesData = standards_chart_data.chartData;
      seriesData[0].colorByPoint = true;
      // seriesData[0].data = [{
      //   name: 'Chrome',
      //   y: 61.41,
      //   sliced: true,
      //   selected: true
      // }, {
      //   name: 'Internet Explorer',
      //   y: 11.84
      // }]
    }
    Highcharts.chart('pieChartCintainer', {
        chart: {
          plotBackgroundColor: null,
          plotBorderWidth: null,
          plotShadow: false,
          type: 'pie'
        },
        title: {
          text: `Standard Strength in ${standards_chart_data.academic_year}`
        },
        tooltip: {
          pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b>'
        },
        accessibility: {
          point: {
            valueSuffix: '%'
          }
        },
        plotOptions: {
          pie: {
            allowPointSelect: true,
            cursor: 'pointer',
            dataLabels: {
              enabled: true,
              format: '<b>{point.name}</b>: {point.percentage:.1f} %'
            }
          }
        },
        series:seriesData
      });
  }
  componentDidMount(){
    this.getChartData();
  }

  render() {
    return (
<figure class="highcharts-figure">
    <div id="pieChartCintainer"></div>
    <p class="highcharts-description">
    </p>
</figure>

    );
  } 
}

export default (CommonComponent);