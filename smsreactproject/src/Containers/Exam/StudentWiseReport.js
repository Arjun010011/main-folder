import React, { Component } from 'react'
import { Paper, Box, Grid, Button, CircularProgress } from '@material-ui/core'
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined'
import { Link } from 'react-router-dom'
import classNames from 'classnames'

import AllMUIDataTable from 'Components/AllMUIDataTable'
import { GET_URL, PUT_URL, DEL_URL } from 'Includes/urls'
import { getRequest, putRequest, deleteRequest } from 'Includes/api/apicall'
import { isUserHasPermission } from 'Includes/functions'
import { Actions } from 'Constants/permissions'
import { options } from 'Constants'

class SubjectWiseReport extends Component {
  constructor() {
    super()
    this.state = {
      reportData: [],
      loading: true,
      updating: false,
      columns: [
        { name: 'id', label: 'ID', options: { display: false } },
        { name: 'subject', label: 'Subject', options: { filter: true, sort: true } },
        { name: 'marks', label: 'Marks', options: { filter: true, sort: true } },
        { name: 'grade', label: 'Grade', options: { filter: true, sort: true } },
        { name: 'attendance', label: 'Attendance', options: { filter: true, sort: true } },
        { name: 'remarks', label: 'Remarks', options: { filter: false, sort: false } },
      ],      
    }
  }

  componentDidMount() {
    this.fetchReportData()
    this.setState({ options: options })
  }

  fetchReportData = () => {
    this.setState({ loading: true })
    getRequest(GET_URL.subjectWiseReport.api, {}, this.props).then((response) => {
      if (response && response.status === 200) {
        this.setState({ reportData: response.data.data, loading: false })
      }
    })
  }

  render() {
    const { loading, reportData, columns, updating } = this.state

    if (loading) {
      return (
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress />
        </Box>
      )
    }

    return (
      <Box>
        <Paper className={classNames('paper-background')}>
          <Grid container>
            <Grid item md={6} xs={12} className={classNames('header-align')}>
              <Box className="heading">Subject-wise Report</Box>
              <Box className="sub-heading">Report showing student marks for each subject</Box>
            </Grid>
            <Grid item md={6} xs={12}>
              <Box className={classNames('header-align', 'end-flex-prop')}>
                {isUserHasPermission('reports_subject_wise', 'create') && (
                  <Button
                    variant="contained"
                    component={Link}
                    to={Actions.reports_subject_wise.create?.url || '#'}
                    className="editbutton-view"
                  >
                    <AddCircleOutlineOutlinedIcon className="visibility-icon" /> Generate Report
                  </Button>
                )}
              </Box>
            </Grid>
          </Grid>
          <Grid container className={classNames('header-align')}>
            <Grid item xs={12}>
              <Paper>
                <AllMUIDataTable
                  key={reportData.length} // refresh on data change
                  title={updating ? <CircularProgress className="white-text" /> : ''}
                  data={reportData}
                  columns={columns}
                  options={this.state.options}
                />
              </Paper>
            </Grid>
          </Grid>
        </Paper>
      </Box>
    )
  }
}

export default SubjectWiseReport
