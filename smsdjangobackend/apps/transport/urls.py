from rest_framework import routers

from apps.transport.views import (RouteViewSet, RouteAreaViewSet, RoutePriceViewSet, VehicleViewSet,
                                  VehicleDriverMappingViewSet, VehicleRouteMappingViewSet,
                                  DriverLocationViewSet, DriverViewSet, RouteUserAddressViewSet, RideDetailViewSet,
                                  RideStatusViewSet, RideAttendanceViewSet, RoutePricePlanViewSet,
                                  RoutePricePlanApproveViewSet, GpsMachineViewSet, GetVehicleLocationViewSet,CopyRouteUserAddressViewSet,
                                  RouteDetailGpsViewSet, GpsRouteNotificationViewSet,VehicleLocationtrackingViewSet)

router = routers.DefaultRouter()
router.register(r'route', RouteViewSet, basename='route')
router.register(r'area', RouteAreaViewSet, basename='area')
router.register(r'routepriceplan', RoutePricePlanViewSet, basename='routepriceplan')
router.register(r'routeprice', RoutePriceViewSet, basename='routeprice')
router.register(r'routepriceplanapprove', RoutePricePlanApproveViewSet, basename='routepriceplanapprove')
router.register(r'routeuseraddress', RouteUserAddressViewSet, basename='routeuseraddress')
router.register(r'copyrouteuseraddress', CopyRouteUserAddressViewSet, basename='copyrouteuseraddress')
router.register(r'vehicle', VehicleViewSet, basename='vehicle')
router.register(r'vehicledriver', VehicleDriverMappingViewSet, basename='vehicledriver')
router.register(r'vehicleroute', VehicleRouteMappingViewSet, basename='vehicleroute')
router.register(r'driver', DriverViewSet, basename='driver')
router.register(r'driverlocation', DriverLocationViewSet, basename='driverlocation')
router.register(r'ridedetail', RideDetailViewSet, basename='ridedetail')
router.register(r'ridestatus', RideStatusViewSet, basename='ridestatus')
router.register(r'rideattendance', RideAttendanceViewSet, basename='rideattendance')
router.register(r'gpsmachine', GpsMachineViewSet, basename='gpsmachine')
router.register(r'getvehiclelocation', GetVehicleLocationViewSet, basename='getvehiclelocation')
router.register(r'routedetailsgps',RouteDetailGpsViewSet, basename='routedetailsgps')
router.register(r'gpsroutenotification',GpsRouteNotificationViewSet, basename='routedetailsgps')
router.register(r'gpslocationtracking',VehicleLocationtrackingViewSet,basename='gpslocationtracking')
# router.register(r'studentroute', StudentRouteViewSet, basename='studentroute')
urlpatterns = router.urls
