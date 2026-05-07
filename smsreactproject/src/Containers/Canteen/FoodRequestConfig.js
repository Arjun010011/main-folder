import React, { Component } from 'react';
import {
    Box, Grid, Paper, TextField, Button, Typography, Chip,
} from '@material-ui/core';
import { withRouter } from 'react-router-dom';
import Swal from 'sweetalert2';
import SaveIcon from '@material-ui/icons/Save';

import loadingBar from 'images/loading.gif';
import { getRequest, postRequest, putRequest } from 'Includes/api/apicall';
import { GET_URL, POST_URL, PUT_URL } from 'Includes/urls';
import canteenStyles from './canteenStyles';

class FoodRequestConfig extends Component {
    state = {
        loading: true,
        configId: null,
        request_cutoff_time: '18:00',
        min_advance_days: 1,
        cancellation_cutoff_time: '20:00',
        saving: false,
    };

    componentDidMount() {
        this.loadConfig();
    }

    loadConfig = () => {
        this.setState({ loading: true });
        getRequest(`${GET_URL.food_request_config.api}?limit=1&pageno=1`, {}, this.props).then(res => {
            const data = res?.data?.results || res?.data?.data?.data_list || res?.data?.data || [];
            if (data.length > 0) {
                const cfg = data[0];
                this.setState({
                    configId: cfg.id,
                    request_cutoff_time: cfg.request_cutoff_time?.substring(0, 5) || '18:00',
                    min_advance_days: cfg.min_advance_days || 1,
                    cancellation_cutoff_time: cfg.cancellation_cutoff_time?.substring(0, 5) || '20:00',
                    loading: false,
                });
            } else {
                this.setState({ loading: false });
            }
        }).catch(() => this.setState({ loading: false }));
    };

    handleSave = () => {
        const { configId, request_cutoff_time, min_advance_days, cancellation_cutoff_time } = this.state;
        const payload = {
            request_cutoff_time: request_cutoff_time + ':00',
            min_advance_days: parseInt(min_advance_days) || 1,
            cancellation_cutoff_time: cancellation_cutoff_time + ':00',
        };

        this.setState({ saving: true });
        const req = configId
            ? putRequest(`${PUT_URL.food_request_config.api}${configId}/`, payload, this.props)
            : postRequest(POST_URL.food_request_config.api, payload, this.props);

        req.then(res => {
            if (res && res.status === 200) {
                Swal.fire({ icon: 'success', title: res.data?.Reason || 'Configuration saved!', timer: 1500, showConfirmButton: false });
                this.loadConfig();
            }
            this.setState({ saving: false });
        }).catch(() => this.setState({ saving: false }));
    };

    render() {
        const { loading, request_cutoff_time, min_advance_days, cancellation_cutoff_time, saving } = this.state;
        const s = canteenStyles;

        if (loading) return <Box display="flex" justifyContent="center" p={4}><img src={loadingBar} className="loading" alt="loading" /></Box>;

        return (
            <Paper style={{ ...s.card, padding: 24, maxWidth: 600 }}>
                <Typography style={{ fontSize: 18, fontWeight: 600, color: '#333', marginBottom: 8 }}>
                    Food Request Configuration
                </Typography>
                <Typography style={{ fontSize: 13, color: '#999', marginBottom: 24 }}>
                    Control when staff and students can submit and cancel food requests.
                </Typography>

                <Grid container spacing={3}>
                    <Grid item xs={12}>
                        <TextField variant="outlined" fullWidth size="small" type="time"
                            label="Request Cutoff Time"
                            helperText="Latest time to submit a request for the next day"
                            value={request_cutoff_time}
                            onChange={e => this.setState({ request_cutoff_time: e.target.value })}
                            InputLabelProps={{ shrink: true }} />
                    </Grid>

                    <Grid item xs={12}>
                        <TextField variant="outlined" fullWidth size="small" type="number"
                            label="Minimum Advance Days"
                            helperText="How many days in advance a request must be placed"
                            value={min_advance_days}
                            onChange={e => this.setState({ min_advance_days: Math.max(1, parseInt(e.target.value) || 1) })}
                            inputProps={{ min: 1 }} />
                    </Grid>

                    <Grid item xs={12}>
                        <TextField variant="outlined" fullWidth size="small" type="time"
                            label="Cancellation Cutoff Time"
                            helperText="Latest time to cancel a request (day before requested date)"
                            value={cancellation_cutoff_time}
                            onChange={e => this.setState({ cancellation_cutoff_time: e.target.value })}
                            InputLabelProps={{ shrink: true }} />
                    </Grid>
                </Grid>

                <Box mt={3} display="flex" justifyContent="flex-end">
                    <Button variant="contained" disabled={saving} onClick={this.handleSave}
                        style={{ background: '#1C52C8', color: '#fff', textTransform: 'none', fontWeight: 600 }}
                        startIcon={<SaveIcon />}>
                        Save Configuration
                    </Button>
                </Box>
            </Paper>
        );
    }
}

export default withRouter(FoodRequestConfig);
