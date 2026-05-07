import React, { Component } from 'react'
import OrgChart from '@unicef/react-org-chart'
import avatarPersonnel from './avatar-personnel.svg'
import { Paper, Box, Grid, Button, CircularProgress, Tooltip } from '@material-ui/core';
import loadingBar from 'images/loading.gif';
import { getRequest } from 'Includes/api/apicall';
import './styles.scss';

class OrganizationChart extends Component {

    constructor(props) {
        super(props)
        this.state = {
            config: {},
            loading: true
        }
    }

    handleDownload = () => {
        this.setState({ downloadingChart: false })
    }

    handleOnChangeConfig = config => {
        this.setState({ config: config })
    }
    
    handleLoadConfig = () => {
        const { config } = this.state
        return config
    }


    render() {
        const { treeDetails } = this.props;
        const downloadImageId = 'download-image'
        const downloadPdfId = 'download-pdf'
        return (
            <div style={{ position: 'relative' }}>
                <div className="zoom-buttons">
                    <button
                        className="btn btn-outline-primary zoom-button"
                        id="zoom-in"
                    >
                        +
                    </button>
                    <button
                        className="btn btn-outline-primary zoom-button"
                        id="zoom-out"
                    >
                        -
                    </button>
                </div>
                <div className="download-buttons">
                    {/* <button className="btn btn-outline-primary" id="download-image">
                        Download as image
                    </button> */}
                    <button className="btn btn-outline-primary" id="download-pdf">
                        Download as PDF
                    </button>
                </div>
                <OrgChart
                    tree={treeDetails}
                    downloadImageId={downloadImageId}
                    downloadPdfId={downloadPdfId}
                    onConfigChange={config => {
                        this.handleOnChangeConfig(config)
                    }}
                    loadConfig={d => {
                        let configuration = this.handleLoadConfig(d)
                        if (configuration) {
                            return configuration
                        }
                    }}
                    downlowdedOrgChart={d => {
                        this.handleDownload()
                    }}
                    loadImage={d => {
                        const Image= d.person?.avatar ?? avatarPersonnel
                        return Promise.resolve(Image)
                    }}
                    loadParent={d => {
                        const parentData = this.props.getParent(d)
                        return parentData
                    }}
                    loadChildren={d => {
                        const childrenData = this.props.getChild(d)
                        return childrenData
                    }}
                />
            </div>
        )
    }
}

export default OrganizationChart
