from rest_framework import routers

from apps.chats.views import ConversationViewSet, MessageViewSet, MyChatViewSet, ChatbotViewSet, ChatbotSuggestionsViewSet


router = routers.DefaultRouter()
router.register(r'message', MessageViewSet, basename='message')
router.register(r'conversation', ConversationViewSet, basename='conversation')
router.register(r'mychat', MyChatViewSet, basename='mychat')
router.register(r'chatbot', ChatbotViewSet, basename='chatbot')
router.register(r'chatbotsuggestions', ChatbotSuggestionsViewSet, basename='chatbotsuggestions')
urlpatterns = router.urls