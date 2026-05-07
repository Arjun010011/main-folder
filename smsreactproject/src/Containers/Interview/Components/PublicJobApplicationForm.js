import React, { Component } from "react";
import { GET_URL, POST_URL } from "Includes/urls";
import { getRequest, postRequest } from "Includes/api/apicall";
import Swal from "sweetalert2";
import "./PublicJobApplicationForm.css";

class PublicJobApplicationForm extends Component {
  constructor(props) {
    super(props);
    this.state = {
      first_name: "",
      last_name: "",
      email: "",
      country_code: "+91",
      mobile_num: "",
      dob: "",
      gender: "",
      qualification: "",
      experience_years: "",
      current_organization: "",
      address: "",
      interview_setup: "",
      job_role: "",
      setups: [],
      selectedSetup: null,
      tokenFromUrl: false,
      invalidToken: false,
      photo: null,
      resume: null,
      additional_documents: [],
      loading: false,
      formSubmitted: false,
      errors: {},
    };
  }

  componentDidMount() {
    this.fetchSetups();
  }

  fetchSetups = () => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    let url = GET_URL.publicjobapplication.api;
    if (token) {
      url += `?token=${token}`;
    }
    getRequest(url, {}, this.props)
      .then((response) => {
        if (response && response.data && response.data.data) {
          const setups = response.data.data;
          if (token && setups.length === 0) {
            this.setState({ invalidToken: true });
            return;
          }
          this.setState({ setups }, () => {
            if (token && setups.length > 0) {
              this.setState({ tokenFromUrl: true });
              this.handleSetupSelect(setups[0].id);
            }
          });
        }
      })
      .catch((err) => {
        console.error("Error fetching setups:", err);
        if (token) this.setState({ invalidToken: true });
      });
  };

  handleSetupSelect = (setupId) => {
    const setup = this.state.setups.find((s) => String(s.id) === String(setupId));
    if (setup) {
      this.setState({
        interview_setup: setup.id,
        job_role: setup.job_role,
        selectedSetup: setup,
      });
    }
  };

  handleChange = (e) => {
    const { name, value } = e.target;
    this.setState({ [name]: value, errors: { ...this.state.errors, [name]: "" } });
    if (name === "interview_setup" && value) {
      this.handleSetupSelect(value);
    } else if (name === "interview_setup" && !value) {
      this.setState({ job_role: "", selectedSetup: null });
    }
  };

  handleFileChange = (e, field) => {
    const file = e.target.files[0];
    if (file) {
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

  validateForm = () => {
    const errors = {};
    if (!this.state.first_name.trim()) errors.first_name = "First name is required";
    if (!this.state.interview_setup) errors.interview_setup = "Please select a position";

    // Email validation
    if (this.state.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(this.state.email.trim())) {
        errors.email = "Please enter a valid email address";
      }
    }

    // Phone validation
    if (!this.state.mobile_num.trim()) {
      errors.mobile_num = "Mobile number is required";
    } else {
      const phoneDigits = this.state.mobile_num.replace(/\D/g, "");
      if (phoneDigits.length !== 10) {
        errors.mobile_num = "Please enter a valid 10-digit mobile number";
      }
    }

    this.setState({ errors });
    return Object.keys(errors).length === 0;
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

  handleSubmit = async (e) => {
    e.preventDefault();
    if (!this.validateForm()) return;

    this.setState({ loading: true });

    try {
      let photoId = null;
      let resumeId = null;

      // Upload photo
      if (this.state.photo) {
        photoId = await this.uploadFile(this.state.photo);
      }

      // Upload resume
      if (this.state.resume) {
        resumeId = await this.uploadFile(this.state.resume);
      }

      // Upload additional documents
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
        mobile_num: `${this.state.country_code}${this.state.mobile_num}`,
        dob: this.state.dob || null,
        gender: this.state.gender || null,
        job_role: this.state.job_role,
        interview_setup: this.state.interview_setup || null,
        qualification: this.state.qualification,
        experience_years: this.state.experience_years ? parseInt(this.state.experience_years) : null,
        current_organization: this.state.current_organization,
        address: this.state.address,
        photo: photoId,
        resume: resumeId,
        additional_documents: additionalDocs,
      };

      const url = POST_URL.publicjobapplication.api;
      const response = await postRequest(url, payload, this.props);

      if (response && response.data) {
        this.setState({ formSubmitted: true, loading: false });
        Swal.fire({ icon: "success", title: "Success!", text: "Your application has been submitted successfully!" });
      } else {
        this.setState({ loading: false });
        Swal.fire({ icon: "error", title: "Error", text: "Something went wrong. Please try again." });
      }
    } catch (err) {
      this.setState({ loading: false });
      Swal.fire({ icon: "error", title: "Error", text: "Something went wrong. Please try again." });
    }
  };

  render() {
    const { errors, setups, selectedSetup, loading, formSubmitted, invalidToken } = this.state;

    if (invalidToken) {
      return (
        <div className="public-job-form-container">
          <div className="thank-you-card">
            <div className="thank-you-icon" style={{ background: "#fce4ec", color: "#c62828" }}>✕</div>
            <h2 style={{ color: "#c62828" }}>Invalid Link</h2>
            <p>This application link is invalid or has expired.</p>
            <p>Please scan a valid QR code or contact the organization.</p>
          </div>
        </div>
      );
    }

    if (formSubmitted) {
      return (
        <div className="public-job-form-container">
          <div className="thank-you-card">
            <div className="thank-you-icon">✓</div>
            <h2>Thank You!</h2>
            <p>Your application has been submitted successfully.</p>
            <p>We will review your application and get back to you soon.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="public-job-form-container">
        <div className="public-job-form-card">
          <div className="form-header">
            <h2>Job Application Form</h2>
            <p>Fill out the form below to apply for a position</p>
          </div>

          <form onSubmit={this.handleSubmit} className="job-application-form">

            {/* Requirements & Instructions Banner */}
            {selectedSetup && (selectedSetup.requirements || selectedSetup.instructions) && (
              <div className="form-section" style={{ background: "#f0f7ff", border: "1px solid #bbdefb", borderRadius: "8px", padding: "16px", marginBottom: "16px" }}>
                {selectedSetup.requirements && (
                  <div style={{ marginBottom: selectedSetup.instructions ? "12px" : 0 }}>
                    <h4 style={{ margin: "0 0 6px 0", color: "#1565c0", fontSize: "14px" }}>📋 Requirements</h4>
                    <p style={{ margin: 0, whiteSpace: "pre-line", fontSize: "14px", color: "#333" }}>{selectedSetup.requirements}</p>
                  </div>
                )}
                {selectedSetup.instructions && (
                  <div>
                    <h4 style={{ margin: "0 0 6px 0", color: "#1565c0", fontSize: "14px" }}>📝 Instructions</h4>
                    <p style={{ margin: 0, whiteSpace: "pre-line", fontSize: "14px", color: "#333" }}>{selectedSetup.instructions}</p>
                  </div>
                )}
              </div>
            )}

            {/* Position Selection */}
            <div className="form-section">
              <h3 className="section-title">Position</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Select Position <span className="required">*</span></label>
                  {this.state.interview_setup && selectedSetup ? (
                    <input
                      type="text"
                      value={`${selectedSetup.name} (${selectedSetup.job_role_name || "—"})`}
                      readOnly
                      style={{ background: "#f5f5f5", cursor: "not-allowed" }}
                    />
                  ) : (
                    <select
                      name="interview_setup"
                      value={this.state.interview_setup}
                      onChange={this.handleChange}
                      className={errors.interview_setup ? "error-input" : ""}
                    >
                      <option value="">Select Position</option>
                      {setups.map((s) => (
                        <option key={s.id} value={s.id}>{s.name} ({s.job_role_name || "—"})</option>
                      ))}
                    </select>
                  )}
                  {errors.interview_setup && <span className="error-text">{errors.interview_setup}</span>}
                </div>
              </div>
            </div>

            {/* Personal Information */}
            <div className="form-section">
              <h3 className="section-title">Personal Information</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>First Name <span className="required">*</span></label>
                  <input
                    type="text"
                    name="first_name"
                    value={this.state.first_name}
                    onChange={this.handleChange}
                    placeholder="Enter first name"
                    className={errors.first_name ? "error-input" : ""}
                  />
                  {errors.first_name && <span className="error-text">{errors.first_name}</span>}
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <input
                    type="text"
                    name="last_name"
                    value={this.state.last_name}
                    onChange={this.handleChange}
                    placeholder="Enter last name"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={this.state.email}
                    onChange={this.handleChange}
                    placeholder="Enter email address"
                    className={errors.email ? "error-input" : ""}
                  />
                  {errors.email && <span className="error-text">{errors.email}</span>}
                </div>
                <div className="form-group">
                  <label>Mobile Number <span className="required">*</span></label>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <select
                      name="country_code"
                      value={this.state.country_code}
                      onChange={this.handleChange}
                      style={{ width: "90px", flexShrink: 0 }}
                    >
                      <option value="+91">+91</option>
                      <option value="+1">+1</option>
                      <option value="+44">+44</option>
                      <option value="+971">+971</option>
                      <option value="+61">+61</option>
                      <option value="+65">+65</option>
                      <option value="+966">+966</option>
                    </select>
                    <input
                      type="text"
                      name="mobile_num"
                      value={this.state.mobile_num}
                      onChange={this.handleChange}
                      placeholder="Enter mobile number"
                      maxLength="10"
                      className={errors.mobile_num ? "error-input" : ""}
                      style={{ flex: 1 }}
                    />
                  </div>
                  {errors.mobile_num && <span className="error-text">{errors.mobile_num}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Date of Birth</label>
                  <input
                    type="date"
                    name="dob"
                    value={this.state.dob}
                    onChange={this.handleChange}
                  />
                </div>
                <div className="form-group">
                  <label>Gender</label>
                  <select name="gender" value={this.state.gender} onChange={this.handleChange}>
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Professional Information */}
            <div className="form-section">
              <h3 className="section-title">Professional Information</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Job Role</label>
                  <input
                    type="text"
                    value={selectedSetup ? (selectedSetup.job_role_name || "—") : ""}
                    readOnly
                    placeholder="Auto-filled from position"
                    style={{ background: "#f5f5f5", cursor: "not-allowed" }}
                  />
                </div>
                <div className="form-group">
                  <label>Qualification</label>
                  <input
                    type="text"
                    name="qualification"
                    value={this.state.qualification}
                    onChange={this.handleChange}
                    placeholder="e.g. B.Ed, M.Sc, MBA"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Experience (Years)</label>
                  <input
                    type="number"
                    name="experience_years"
                    value={this.state.experience_years}
                    onChange={this.handleChange}
                    placeholder="Years of experience"
                    min="0"
                  />
                </div>
                <div className="form-group">
                  <label>Current Organization</label>
                  <input
                    type="text"
                    name="current_organization"
                    value={this.state.current_organization}
                    onChange={this.handleChange}
                    placeholder="Current employer"
                  />
                </div>
              </div>

              <div className="form-row full-width">
                <div className="form-group">
                  <label>Address</label>
                  <textarea
                    name="address"
                    value={this.state.address}
                    onChange={this.handleChange}
                    placeholder="Enter your address"
                    rows="3"
                  />
                </div>
              </div>
            </div>

            {/* Documents Upload */}
            <div className="form-section">
              <h3 className="section-title">Upload Documents</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Photo</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => this.handleFileChange(e, "photo")}
                  />
                  {this.state.photo && (
                    <span className="file-name">{this.state.photo.name}</span>
                  )}
                </div>
                <div className="form-group">
                  <label>Resume</label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => this.handleFileChange(e, "resume")}
                  />
                  {this.state.resume && (
                    <span className="file-name">{this.state.resume.name}</span>
                  )}
                </div>
              </div>

              {/* Additional Documents */}
              <div className="additional-docs">
                <div className="docs-header">
                  <label>Additional Documents</label>
                  <button
                    type="button"
                    className="add-doc-btn"
                    onClick={this.addAdditionalDocument}
                  >
                    + Add Document
                  </button>
                </div>
                {this.state.additional_documents.map((doc, index) => (
                  <div key={index} className="doc-row">
                    <input
                      type="text"
                      placeholder="Document label (e.g. Marksheet)"
                      value={doc.label}
                      onChange={(e) => this.handleAdditionalDocChange(index, "label", e.target.value)}
                    />
                    <input
                      type="file"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        this.handleAdditionalDocChange(index, "file", file);
                      }}
                    />
                    <button
                      type="button"
                      className="remove-doc-btn"
                      onClick={() => this.removeAdditionalDocument(index)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? "Submitting..." : "Submit Application"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }
}

export default PublicJobApplicationForm;
