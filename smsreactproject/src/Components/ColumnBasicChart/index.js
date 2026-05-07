import React from 'react';
import { checkAuthentication } from 'Includes/functions';
// import "font-awesome/css/font-awesome.css";
var Highcharts = require('highcharts')
class CommonComponent extends React.Component { 
  constructor(props){
    super(props);
  }
  getChartData = () => {
      const { staff_students_data } = this.props;
    new Highcharts.chart('container', {
        chart: {
            type: 'column'
        },
        title: {
            text: 'Staff and Students List'
        },
        subtitle: {
            text: ''
        },
        xAxis: {
            categories: staff_students_data.years_list,
            crosshair: true
        },
        yAxis: {
            min: 0,
            title: {
                text: 'Number of students'
            }
        },
        tooltip: {
            headerFormat: '<span style="font-size:10px">{point.key}</span><table>',
            pointFormat: '<tr><td style="color:{series.color};padding:0">{series.name}: </td>' +
                '<td style="padding:0"><b>{point.y:.1f} </b></td></tr>',
            footerFormat: '</table>',
            shared: true,
            useHTML: true
        },
        plotOptions: {
            column: {
                pointPadding: 0.2,
                borderWidth: 0
            }
        },
        series: staff_students_data.series
    });
  }
  componentDidMount(){
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

export default (CommonComponent);