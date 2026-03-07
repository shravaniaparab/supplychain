"""URL configuration for supplychain project."""
from django.contrib import admin
from django.urls import include, path
from rest_framework import routers

from supplychain import views
from supplychain import admin_views
from supplychain.auth_views import RegisterView, LoginView, LogoutView, MeView
from supplychain.transport_views import (
    TransportRequestCreateView,
    TransportAcceptView,
    TransportDeliverView,
    TransportRejectView
)
from supplychain.distributor_views import StoreBatchView, RequestTransportToRetailerView
from supplychain.retailer_views import MarkBatchSoldView
from supplychain.consumer_views import BatchTraceView
try:
    from supplychain.payment_views import (
        PaymentViewSet,
        PaymentDeclareView,
        PaymentSettleView
    )
    print("DEBUG: PaymentViewSet imported successfully")
except Exception as e:
    print(f"DEBUG: PaymentViewSet import FAILED: {e}")
    import traceback
    traceback.print_exc()
    PaymentViewSet = None
from supplychain.suspend_views import SuspendBatchView

router = routers.DefaultRouter()
router.register(r"users", views.UserViewSet, basename="user")
router.register(r"stakeholders", views.StakeholderProfileViewSet)
router.register(r"kyc-records", views.KYCRecordViewSet)
router.register(r"crop-batches", views.CropBatchViewSet)
router.register(r"transport-requests", views.TransportRequestViewSet)
router.register(r"inspection-reports", views.InspectionReportViewSet)
router.register(r"batch-splits", views.BatchSplitViewSet)
router.register(r"retail-listings", views.RetailListingViewSet)
if PaymentViewSet is not None:
    router.register(r"payments", PaymentViewSet, basename="payment")
    print("DEBUG: payments route registered")
else:
    print("DEBUG: payments route NOT registered - PaymentViewSet is None")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include(router.urls)),
    
    # Admin Custom Endpoints
    path("api/admin/kyc/pending/", admin_views.PendingKYCListView.as_view(), name="admin-kyc-pending"),
    path("api/admin/kyc/all/", admin_views.AllKYCListView.as_view(), name="admin-kyc-all"),
    path("api/admin/kyc/decide/<int:pk>/", admin_views.KYCDecisionView.as_view(), name="admin-kyc-decide"),
    path("api/admin/stats/", admin_views.DashboardStatsView.as_view(), name="admin-stats"),
    path("api/admin/users/", admin_views.UserListView.as_view(), name="admin-users-list"),
    path("api/admin/users/<int:pk>/", admin_views.UserDetailView.as_view(), name="admin-users-detail"),

    # Auth endpoints
    path("api/auth/register/", RegisterView.as_view(), name="auth-register"),
    path("api/auth/login/", LoginView.as_view(), name="auth-login"),
    path("api/auth/logout/", LogoutView.as_view(), name="auth-logout"),
    path("api/auth/me/", MeView.as_view(), name="auth-me"),
    
    # Transport Workflow Endpoints
    path("api/transport/request/", TransportRequestCreateView.as_view(), name="transport-request-create"),
    path("api/transport/<int:pk>/accept/", TransportAcceptView.as_view(), name="transport-accept"),
    path("api/transport/<int:pk>/deliver/", TransportDeliverView.as_view(), name="transport-deliver"),
    path("api/transport/<int:pk>/reject/", TransportRejectView.as_view(), name="transport-reject"),
    
    # Distributor Endpoints
    path("api/distributor/batch/<int:batch_id>/store/", StoreBatchView.as_view(), name="distributor-store-batch"),
    path("api/distributor/transport/request-to-retailer/", RequestTransportToRetailerView.as_view(), name="distributor-request-transport-retailer"),
    
    # Retailer Endpoints
    path("api/retailer/batch/<int:batch_id>/mark-sold/", MarkBatchSoldView.as_view(), name="retailer-mark-sold"),
    
    # Consumer Trace Endpoint
    path("api/public/trace/<str:public_id>/", BatchTraceView.as_view(), name="consumer-trace"),
    
    # Payment Endpoints
    path("api/payment/<int:pk>/declare/", PaymentDeclareView.as_view(), name="payment-declare"),
    path("api/payment/<int:pk>/settle/", PaymentSettleView.as_view(), name="payment-settle"),
    
    # Suspend Batch Endpoint
    path("api/batch/<int:batch_id>/suspend/", SuspendBatchView.as_view(), name="suspend-batch"),
]

