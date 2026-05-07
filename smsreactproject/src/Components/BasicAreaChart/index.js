import React from 'react';
var Highcharts = require('highcharts')

class CommonComponent extends React.Component { 
  constructor(props){
    super(props);
  }
  getChartData = () => {
      const { basic_area_chart_data } = this.props;
    new Highcharts.chart('container1', {
        chart: {
            type: 'area'
        },
        accessibility: {
            description: ''
        },
        title: {
            text: 'Enquiry and Brochure taken students list'
        },
        xAxis: {
            allowDecimals: false,
            labels: {
                formatter: function () {
                    return this.value; // clean, unformatted number for year
                }
            },
            accessibility: {
                rangeDescription: `Range: ${basic_area_chart_data.pointStart}-${basic_area_chart_data.pointStart + basic_area_chart_data.data.length}`
            }
        },
        yAxis: {
            title: {
                text: 'Number of Students'
            },
            labels: {
                formatter: function () {
                    return this.value;
                }
            }
        },
        tooltip: {
            pointFormat: '{series.name} students: <b>{point.y:,.0f}</b><br/> in {point.x}'
        },
        plotOptions: {
            area: {
                pointStart: basic_area_chart_data.pointStart,
                marker: {
                    enabled: false,
                    symbol: 'circle',
                    radius: 2,
                    states: {
                        hover: {
                            enabled: true
                        }
                    }
                }
            }
        },
        series: basic_area_chart_data.data
    });
  }
  componentDidMount(){
    this.getChartData();
  }

  render() {
    return (
<figure class="highcharts-figure">
    <div id="container1"></div>
    <p class="highcharts-description">
    </p>
</figure>

    );
  } 
}

export default (CommonComponent);