import React, { Component } from "react";
import {
    Paper, Box, Grid, Button, TextField, Divider, IconButton
} from "@material-ui/core";
import { withRouter, Link } from "react-router-dom";
import classNames from "classnames";
import Swal from "sweetalert2";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import { AsyncPaginate } from "react-select-async-paginate";

import { getRequest, postRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL } from "Includes/urls";

class JobApplicationForm extends Component {
    constructor(props) {
        super(props);
        this.state = {
            first_name: "",
            last_name: "",
            email: "",
            mobile_num: "",
            dob: "",
            gender: "",
            qualification: "",
            experience_years: "",
            current_organization: "",
            address: "",
            photo: null,
            resume: null,
            additional_documents: [],
            selectedSetup: null,
            submitting: false,
        };
    }

    loadSetupOptions = async (search, loadedOptions, { page }) => {
        const url = GET_URL.interviewsetup.api;
        const params = { search: search || "", limit: 15, pageno: page + 1 };
        const response = await getRequest(url, params, this.props);
        if (response && response.data && response.data.data && response.data.data.data_list) {
            const options = response.data.data.data_list.map((item) => ({
                value: item.id,
                label: `${item.name} — ${item.job_role_name || ""}`,
                job_role: item.job_role,
            }));
            const hasMore = response.data.data.next ? true : false;
            return {
                options,
                hasMore: hasMore,
                additional: { page: page + 1 },
            };
        }
        return { options: [], hasMore: false };
    };

    handleFileChange = (e, field) => {
        if (e.target.files.length > 0) {
            const file = e.target.files[0];
            this.setState({ [field]: file });
        }
    };

    handleAdditionalDocChange = (index, field, value) => {
        const docs = [...this.state.additional_documents];
        docs[index] = { ...docs[index], [field]: value };
        this.setState({ additional_documents: docs });
    };

    addAdditionalDocument = () => {
        this.setState({
            additional_documents: [
                ...this.state.additional_documents,
                { file: null, label: "" },
            ],
        });
    };

    removeAdditionalDocument = (index) => {
        const docs = [...this.state.additional_documents];
        docs.splice(index, 1);
        this.setState({ additional_documents: docs });
    };

    uploadFile = async (file) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("file_name", file.name);
        const url = POST_URL.uploads.api;
        try {
            const response = await postRequest(url, formData, this.props);
            if (response && response.data && response.data.data) {
                return response.data.data.id || response.data.data[0]?.id;
            }
        } catch (err) {
            console.error("File upload error:", err);
        }
        return null;
    };

    handleSubmit = async () => {
        const { first_name, mobile_num, email, selectedSetup } = this.state;

        if (!selectedSetup) {
            Swal.fire({ icon: "warning", title: "Required", text: "Please select an interview setup." });
            return;
        }
        if (!first_name.trim()) {
            Swal.fire({ icon: "warning", title: "Required", text: "First name is required." });
            return;
        }
        if (!mobile_num.trim()) {
            Swal.fire({ icon: "warning", title: "Required", text: "Mobile number is required." });
            return;
        }
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            Swal.fire({ icon: "warning", title: "Invalid", text: "Please enter a valid email address." });
            return;
        }

        this.setState({ submitting: true });

        let photoId = null;
        let resumeId = null;

        if (this.state.photo) {
            photoId = await this.uploadFile(this.state.photo);
        }

        if (this.state.resume) {
            resumeId = await this.uploadFile(this.state.resume);
        }

        const additionalDocs = [];
        for (const doc of this.state.additional_documents) {
            if (doc.file) {
                const docId = await this.uploadFile(doc.file);
                if (docId) {
                    additionalDocs.push({
                        document: docId,
                        document_label: doc.label || "Document",
                    });
                }
            }
        }

        const payload = {
            first_name: this.state.first_name,
            last_name: this.state.last_name,
            email: this.state.email,
            mobile_num: this.state.mobile_num,
            dob: this.state.dob || null,
            gender: this.state.gender || null,
            interview_setup: selectedSetup.value,
            qualification: this.state.qualification,
            experience_years: this.state.experience_years ? parseInt(this.state.experience_years) : null,
            current_organization: this.state.current_organization,
            address: this.state.address,
            photo: photoId,
            resume: resumeId,
            additional_documents: additionalDocs,
        };

        const url = POST_URL.publicjobapplication.api;
        postRequest(url, payload, this.props).then((response) => {
            this.setState({ submitting: false });
            if (response && response.data) {
                Swal.fire({
                    position: "top-end", icon: "success",
                    title: "Application Added", showConfirmButton: false, timer: 1500,
                });
                this.props.history.push("/interview/applications/list");
            } else {
                Swal.fire({ icon: "error", title: "Error", text: response?.data?.error || "Something went wrong." });
            }
        }).catch(() => {
            this.setState({ submitting: false });
            Swal.fire({ icon: "error", title: "Error", text: "Something went wrong." });
        });
    };

    render() {
        const { submitting } = this.state;

        return (
            <Paper className={classNames("paper-plain-background", "p-b-20px", "m-t-25px")}>
                <Grid container>
                    <Grid item md={6} xs={12} className={classNames("header-align")}>
                        <Box className="heading">Add Job Application</Box>
                    </Grid>
                    <Grid item md={6} xs={12}>
                        <Box className={classNames("header-align", "end-flex-prop")}>
                            <Button
                                variant="contained"
                                component={Link}
                                to="/interview/applications/list"
                                className="editbutton-view"
                            >
                                <VisibilityOutlinedIcon className="visibility-icon" />{" "}
                                Job Applications
                            </Button>
                        </Box>
                    </Grid>
                </Grid>

                <Box mb={3} mt={2}>
                    <Divider />
                </Box>

                <Box className="form-left-heading m-t-20px m-b-20px">
                    Application Details
                </Box>

                <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                        <AsyncPaginate
                            value={this.state.selectedSetup}
                            loadOptions={this.loadSetupOptions}
                            onChange={(val) => this.setState({ selectedSetup: val })}
                            additional={{ page: 0 }}
                            placeholder="Interview Setup *"
                            isClearable
                            styles={{
                                control: (base) => ({
                                    ...base, minHeight: 56, fontSize: 16,
                                    borderColor: "rgba(0, 0, 0, 0.23)",
                                    borderRadius: 4,
                                }),
                                placeholder: (base) => ({ ...base, color: "rgba(0, 0, 0, 0.54)" }),
                                menu: (base) => ({ ...base, zIndex: 9999 }),
                            }}
                        />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <TextField label="First Name *" fullWidth variant="outlined"
                            value={this.state.first_name}
                            onChange={(e) => this.setState({ first_name: e.target.value })}
                        />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <TextField label="Last Name" fullWidth variant="outlined"
                            value={this.state.last_name}
                            onChange={(e) => this.setState({ last_name: e.target.value })}
                        />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <TextField label="Email" fullWidth variant="outlined" type="email"
                            value={this.state.email}
                            onChange={(e) => this.setState({ email: e.target.value })}
                        />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <TextField label="Mobile Number *" fullWidth variant="outlined"
                            value={this.state.mobile_num}
                            onChange={(e) => this.setState({ mobile_num: e.target.value })}
                        />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <TextField label="Date of Birth" fullWidth variant="outlined" type="date"
                            InputLabelProps={{ shrink: true }}
                            value={this.state.dob}
                            onChange={(e) => this.setState({ dob: e.target.value })}
                        />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <TextField label="Gender" fullWidth variant="outlined" select
                            SelectProps={{ native: true }}
                            value={this.state.gender}
                            onChange={(e) => this.setState({ gender: e.target.value })}
                        >
                            <option value=""></option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                        </TextField>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <TextField label="Qualification" fullWidth variant="outlined"
                            value={this.state.qualification}
                            onChange={(e) => this.setState({ qualification: e.target.value })}
                        />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <TextField label="Experience (years)" fullWidth variant="outlined" type="number"
                            value={this.state.experience_years}
                            onChange={(e) => this.setState({ experience_years: e.target.value })}
                        />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <TextField label="Current Organization" fullWidth variant="outlined"
                            value={this.state.current_organization}
                            onChange={(e) => this.setState({ current_organization: e.target.value })}
                        />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <TextField label="Address" fullWidth variant="outlined"
                            value={this.state.address}
                            onChange={(e) => this.setState({ address: e.target.value })}
                        />
                    </Grid>
                </Grid>

                <Box className="form-left-heading m-t-20px m-b-20px">
                    Documents
                </Box>
                <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                        <Box mb={1} color="textSecondary">Photo</Box>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => this.handleFileChange(e, "photo")}
                            style={{ display: 'block', width: '100%', padding: '10px 0' }}
                        />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Box mb={1} color="textSecondary">Resume</Box>
                        <input
                            type="file"
                            accept=".pdf,.doc,.docx"
                            onChange={(e) => this.handleFileChange(e, "resume")}
                            style={{ display: 'block', width: '100%', padding: '10px 0' }}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <Box display="flex" alignItems="center" mb={2}>
                            <Box color="textSecondary" mr={3}>Additional Documents</Box>
                            <Button
                                variant="outlined"
                                color="primary"
                                size="small"
                                onClick={this.addAdditionalDocument}
                            >
                                + Add Document
                            </Button>
                        </Box>
                        {this.state.additional_documents.map((doc, index) => (
                            <Grid container spacing={2} key={index} alignItems="center" style={{ marginBottom: 8 }}>
                                <Grid item xs={12} md={4}>
                                    <TextField
                                        label="Document Label"
                                        fullWidth
                                        variant="outlined"
                                        size="small"
                                        value={doc.label}
                                        placeholder="e.g. Marksheet"
                                        onChange={(e) => this.handleAdditionalDocChange(index, "label", e.target.value)}
                                    />
                                </Grid>
                                <Grid item xs={10} md={4}>
                                    <input
                                        type="file"
                                        onChange={(e) => {
                                            if (e.target.files.length > 0) {
                                                const file = e.target.files[0];
                                                this.handleAdditionalDocChange(index, "file", file);
                                            }
                                        }}
                                        style={{ display: 'block', width: '100%', padding: '10px 0' }}
                                    />
                                </Grid>
                                <Grid item xs={2} md={1}>
                                    <IconButton
                                        color="secondary"
                                        onClick={() => this.removeAdditionalDocument(index)}
                                    >
                                        <DeleteOutlineIcon />
                                    </IconButton>
                                </Grid>
                            </Grid>
                        ))}
                    </Grid>
                </Grid>

                <Box mt={3} display="flex" justifyContent="flex-end">
                    <Button
                        variant="contained"
                        className="editbutton-view"
                        onClick={this.handleSubmit}
                        disabled={submitting}
                    >
                        {submitting ? "Saving..." : "Submit"}
                    </Button>
                </Box>
            </Paper>
        );
    }
}

export default withRouter(JobApplicationForm);
