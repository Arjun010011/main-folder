import { defineMessages } from 'react-intl';

const alias_names = JSON.parse(localStorage.getItem('alias_name')) ? JSON.parse(localStorage.getItem('alias_name')) : {}

export default defineMessages({
    vehicleNumber: {
        id: 'src_vehicleNumber',
        defaultMessage: 'Vehicle Num',
    },
    vehicleCode: {
        id: 'src_vehicleCode',
        defaultMessage: 'Vehicle Code'
    },
    model: {
        id: 'src_model',
        defaultMessage: 'Model'
    },
    manufacturer: {
        id: 'src_manufacturer',
        defaultMessage: 'Manufacturer'
    },
    capacity: {
        id: 'src_capacity',
        defaultMessage: 'Seat Capacity'
    },
    department: {
        id: 'src_department',
        defaultMessage: 'Department'
    },
    brand: {
        id: 'src_brand',
        defaultMessage: 'Brand'
    },
    areaName:{
        id: 'src_areaName',
        defaultMessage: 'Area Name'
    },
    landmark:{
        id: 'src_landmark',
        defaultMessage: 'Landmark'
    },
    km:{
        id: 'src_km',
        defaultMessage: 'Km'
    },
    uptokm:{
        id: 'src_uptokm',
        defaultMessage: 'Upto Km'
    },
    price:{
        id: 'src_price',
        defaultMessage: 'Price'
    },
    planname:{
        id: 'src_planname',
        defaultMessage: 'Plan Name'
    },
    mappedStandards:{
        id: 'src_mappedStandards',
        defaultMessage: `Mapped ${alias_names['standard']}`
    },
    vanDetail:{
        id: 'src_vanDetail',
        defaultMessage: 'Van Details'
    }
})