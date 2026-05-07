import React, { Component } from 'react';
import {
  Paper, Box, Button, Grid, TextField,
} from '@material-ui/core';
import Swal from 'sweetalert2';
import { withRouter } from 'react-router-dom';
import classNames from 'classnames';
import { getRequest, putRequest } from 'Includes/api/apicall';
import { GET_URL, PUT_URL } from 'Includes/urls';
import { Actions } from 'Constants/permissions';
import { Dropdown } from 'Components/DropDown';

const GOING_WITH = [
  { id: 'parent', name: 'Parent' },
  { id: 'guardian', name: 'Guardian' },
  { id: 'self', name: 'Self' },
];

class EditGatePass extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      form: {
        reason: '',
        going_with: 'parent',
        guardian_name: '',
        guardian_phone: '',
        expected_return_time: '',
        date: '',
      },
      errors: {},
      submitting: false,
      gate_pass_number: '',
      user_name: '',
    };
  }

  componentDidMount() {
    const id = this.props.match.params.id;
    if (!id) {
      this.props.history.push(Actions.gate_pass_list.view.url);
      return;
    }
    getRequest(`${GET_URL.gatepass.api.replace(/\/$/, '')}/${id}/`, {}, this.props).then((res) => {
      if (res && res.status === 200 && res.data) {
        const d = res.data;
        let expectedReturn = '';
        if (d.expected_return_time) {
          const dt = new Date(d.expected_return_time);
          expectedReturn = dt.toISOString().slice(0, 16);
        }
        this.setState({
          form: {
            reason: d.reason || '',
            going_with: d.going_with || 'parent',
            guardian_name: d.guardian_name || '',
            guardian_phone: d.guardian_phone || '',
            expected_return_time: expectedReturn,
            date: (d.date || '').slice(0, 10),
          },
          gate_pass_number: d.gate_pass_number || '',
          user_name: d.user_name || '',
        });
      }
      this.setState({ loading: false });
    }).catch(() => this.setState({ loading: false }));
  }

  onChange = (e) => {
    const { name, value } = e.target;
    const { form, errors } = this.state;
    form[name] = value;
    if (errors[name]) delete errors[name];
    this.setState({ form, errors });
  };

  validate = () => {
    const { form } = this.state;
    const errors = {};
    if (!form.reason) errors.reason = 'Reason is required';
    if (!form.date) errors.date = 'Date is required';
    this.setState({ errors });
    return Object.keys(errors).length === 0;
  };

  onSubmit = () => {
    if (!this.validate()) return;
    const id = this.props.match.params.id;
    this.setState({ submitting: true });
    const payload = {
      reason: this.state.form.reason,
      going_with: this.state.form.going_with,
      guardian_name: this.state.form.guardian_name,
      guardian_phone: this.state.form.guardian_phone,
      date: this.state.form.date,
      expected_return_time: this.state.form.expected_return_time || null,
    };
    const url = `${PUT_URL.gatepass.api.replace(/\/$/, '')}/${id}/`;
    putRequest(url, payload, this.props).then((res) => {
      if (res && (res.status === 200 || res.status === 201)) {
        Swal.fire({ position: 'top-end', icon: 'success', title: 'Gate pass updated', showConfirmButton: false, timer: 1500 });
        this.props.history.push(Actions.gate_pass_list.view.url);
      }
      this.setState({ submitting: false });
    }).catch(() => this.setState({ submitting: false }));
  };

  handleBack = () => {
    this.props.history.push(Actions.gate_pass_list.view.url);
  };

  render() {
    const { loading, form, errors, submitting, gate_pass_number, user_name } = this.state;
    if (loading) {
      return (
        <Paper className="paper-background">
          <Box p={4} textAlign="center">Loading...</Box>
        </Paper>
      );
    }
    return (
      <Paper className="paper-background">
        <Grid container>
          <Grid item md={6} xs={12} className={classNames('header-align')}>
            <Box className="heading">Edit Gate Pass</Box>
          </Grid>
          <Grid item md={6} xs={12} className={classNames('header-align', 'end-flex-prop')}>
            <Button variant="contained" onClick={this.handleBack} className="editbutton-view">
              Back to List
            </Button>
          </Grid>
        </Grid>

        <Paper className="mt-20 p-20">
          <Grid container spacing={3}>
            <Grid item md={6} xs={12}>
              <TextField variant="outlined" fullWidth label="Gate Pass No" value={gate_pass_number} disabled className="w-100" />
            </Grid>
            <Grid item md={6} xs={12}>
              <TextField variant="outlined" fullWidth label="Student/Staff" value={user_name} disabled className="w-100" />
            </Grid>

            <Grid item xs={12}>
              <TextField
                variant="outlined"
                fullWidth
                label="Reason"
                name="reason"
                value={form.reason}
                onChange={this.onChange}
                error={!!errors.reason}
                helperText={errors.reason}
                className="w-100"
              />
            </Grid>

            <Grid item md={4} xs={12}>
              <Dropdown
                data={GOING_WITH}
                name="going_with"
                value={form.going_with}
                onChange={this.onChange}
                label="Going with"
                customName="name"
                customId="id"
                hideSelect={true}
                fullWidth
              />
            </Grid>
            <Grid item md={4} xs={12}>
              <TextField
                variant="outlined"
                fullWidth
                label={form.going_with === 'parent' ? 'Parent Name' : form.going_with === 'guardian' ? 'Guardian Name' : 'Contact Name'}
                name="guardian_name"
                value={form.guardian_name}
                onChange={this.onChange}
                className="w-100"
              />
            </Grid>
            <Grid item md={4} xs={12}>
              <TextField
                variant="outlined"
                fullWidth
                label={form.going_with === 'parent' ? 'Parent Phone' : form.going_with === 'guardian' ? 'Guardian Phone' : 'Contact Phone'}
                name="guardian_phone"
                value={form.guardian_phone}
                onChange={this.onChange}
                className="w-100"
              />
            </Grid>

            <Grid item md={4} xs={12}>
              <TextField
                variant="outlined"
                fullWidth
                type="date"
                label="Date"
                name="date"
                value={form.date}
                onChange={this.onChange}
                InputLabelProps={{ shrink: true }}
                error={!!errors.date}
                helperText={errors.date}
                className="w-100"
              />
            </Grid>
            <Grid item md={4} xs={12}>
              <TextField
                variant="outlined"
                fullWidth
                type="datetime-local"
                label="Expected Return Time"
                name="expected_return_time"
                value={form.expected_return_time}
                onChange={this.onChange}
                InputLabelProps={{ shrink: true }}
                className="w-100"
              />
            </Grid>

            <Grid item xs={12}>
              <Button
                variant="contained"
                color="primary"
                onClick={this.onSubmit}
                disabled={submitting}
                className="editbutton-view"
              >
                {submitting ? 'Saving...' : 'Update Gate Pass'}
              </Button>
            </Grid>
          </Grid>
        </Paper>
      </Paper>
    );
  }
}

export default withRouter(EditGatePass);
