import React, { Component } from 'react'
import { Paper } from '@material-ui/core'
import Grid from '@material-ui/core/Grid';
import { TextField } from '@material-ui/core';
import get from '../../actions/API_request/Get'


export default class Address extends Component {
    constructor(props) {
        super(props)

        this.state = {

            selectedCountry: 0,
            countryList: [],
            selectedState: 0,
            stateList: [],
            districtList: [],
            selectedDistrict: 0,
            cityList: [],
            selectedCity: 0


        }
    }


    async componentDidMount() {
        //http://127.0.0.1:8000/country/getcountries/
        let data = await get("shared/getcountries")


        this.setState({
            countryList: data.data,
        })
    }


    onChange = (e) => {
        let name = e.target.name;
        let value = e.target.value;
        this.setState({
            [name]: value
        }, () => {
            this.validation(name, value)
        })

    }

    selectedCountry = async (e) => {
        let name = e.target.name;
        let value = e.target.value;
        this.setState({
            [name]: value
        })
        if (value != 0) {

            if (name === "selectedCountry") {
                let data = await get("shared/getstatesforcountry", value);
                this.setState({
                    stateList: data.data
                })
            }
            else if (name === "selectedState") {
                let data = await get("shared/getdistrictsforstate", value);
                this.setState({
                    districtList: data.data
                })
            }
            else if (name === "selectedDistrict") {
                let data = await get("shared/getcitiesfordistrict", value);
                this.setState({
                    cityList: data.data
                })

            }
        }

    }








    render() {
        const{selectedCountry,countryList,stateList,districtList,cityList,selectedState,selectedDistrict}=this.state
        return (
            <div>


                        <Grid container>

                            <Grid item xs={6}>
                                <select name="selectedCountry"
                                    onChange={this.selectedCountry}>
                                    <option value={0}>Select</option>
                                    {countryList.map(({ id, name }) => {
                                        return <option key={id} value={id}>{name}</option>
                                    })}
                                </select>
                            </Grid>

                            <Grid item xs={6}>
                                {selectedCountry != 0 &&
                                    <select name="selectedState"
                                        onChange={this.selectedCountry}>
                                        <option value={0}>Select</option>
                                        {stateList.map(({ id, name }) => {
                                            return <option key={id} value={id}>{name}</option>
                                        })}
                                    </select>
                                }
                            </Grid>
                            <Grid item xs={6}>
                                {
                                    (selectedCountry != 0 && selectedState != 0) &&
                                    <select name="selectedDistrict"
                                        onChange={this.selectedCountry}>
                                        <option value={0}>Select</option>
                                        {districtList.map(({ id, name }) => {
                                            return <option key={id} value={id}>{name}</option>
                                        })}
                                    </select>
                                }
                            </Grid>
                            <Grid item xs={6}>
                                {
                                    (selectedCountry != 0 && selectedState != 0 && selectedDistrict != 0) &&
                                    <select name="selectedCity"
                                        onChange={this.selectedCountry}>
                                        <option value={0}>Select</option>
                                        {cityList.map(({ id, name }) => {
                                            return <option key={id} value={id}>{name}</option>
                                        })}
                                    </select>
                                }
                            </Grid>

                        </Grid>

            </div>
        )
    }
}
