from rest_framework import exceptions, viewsets

from apps.chats.serializers import ConversationSerializer, MessageIndividualSerializer, MessageReadSerializer, MessageSerializer
from apps.chats.models.chat import Conversation, Message
from apps.chats.services.message import check_is_user_have_access_to_conversation, create_group, get_conversation_data, get_individual_chat_data, get_my_chat_list, search_chat_and_contacts, send_message, update_conversation
from apps.chats.services.chatbot_service import ChatbotService
from rest_framework.response import Response
from rest_framework import status as http_status

from apps.shared.services import SharedService

# Create your views here.
class MessageViewSet(viewsets.ModelViewSet):
    serializer_class = MessageSerializer
    http_method_names = ['post', 'delete']

    def get_queryset(self):
        self.queryset = Message.objects.filter(is_active=True)
        return self.queryset

    def create(self, request):
        response = send_message(self, request.data)
        return Response(response)
    
    def destroy(self, request, *args, **kwargs):
        self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
        response = SharedService.soft_delete_data(self)
        return Response(response)

class ConversationViewSet(viewsets.ModelViewSet):
    serializer_class = ConversationSerializer
    http_method_names = ['post', 'put', 'get', 'delete']

    def get_queryset(self):
        return Conversation.objects.all()

    def create(self, request):
        response = create_group(self, request.data)
        return Response(response)
    
    def update(self, request, *args, **kwargs):
        response = update_conversation(self, request.data)
        return Response(response)
    
    def retrieve(self, request, *args, **kwargs):
        response = get_conversation_data(self)
        return Response(response)
    
    def destroy(self, request, *args, **kwargs):
        check_is_user_have_access_to_conversation(self, self.kwargs['pk'])
        self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
        response = SharedService.soft_delete_data(self)
        return Response(response)
    
class MyChatViewSet(viewsets.ModelViewSet):
    serializer_class = MessageIndividualSerializer
    http_method_names = ['post', 'get']

    def get_queryset(self):
        return Message.objects.all()

    def create(self, request, *args, **kwargs):
        response = get_my_chat_list(self, request.data)
        return Response(response)
    
    def retrieve(self, request, *args, **kwargs):
        response = get_individual_chat_data(self)
        return Response(response)
    
    #used to search the new chat and existing data
    def list(self, request, *args, **kwargs):
        response = search_chat_and_contacts(self)
        return Response(response)

class ChatbotViewSet(viewsets.ViewSet):
    """
    ViewSet for AI chatbot interactions
    """
    http_method_names = ['post']
    
    def create(self, request):
        """
        Handle chatbot query and return AI response with permission-based filtering
        """
        query = request.data.get('query') or request.data.get('message', '')
        
        if not query:
            return Response({
                'error': 'Query is required',
                'detail': 'Query is required',
            }, status=http_status.HTTP_400_BAD_REQUEST)
        
        # Get intelligent response from chatbot service with user permissions
        user = request.user if hasattr(request, 'user') and request.user.is_authenticated else None
        academic_year = request.data.get('academic_year') or request.data.get('academic_year_id')
        exam_id = request.data.get('exam_id')
        response_style = request.data.get('response_style')
        payload = ChatbotService.get_response_payload(
            query,
            user=user,
            academic_year=academic_year,
            exam_id=exam_id,
            response_style=response_style,
        )

        return Response(
            {
                'response': payload['response'],
                'message': payload['message'],
                'query': payload.get('query', query),
                'structured': payload.get('structured'),
                'response_style': payload.get('response_style'),
            }
        )

class ChatbotSuggestionsViewSet(viewsets.ViewSet):
    """
    ViewSet for chatbot suggestion questions
    """
    http_method_names = ['get']
    
    def list(self, request):
        """
        Return list of suggested questions for the chatbot based on user permissions
        """
        user = request.user if hasattr(request, 'user') and request.user.is_authenticated else None
        user_modules = ChatbotService.get_user_modules(user) if user else set(ChatbotService.KNOWLEDGE_BASE.keys())
        
        # Base suggestions: using the product + live student facts in chat
        suggestions = [
            "How do I use this application?",
            "What are my marks?",
            "Ramesh marks card — replace with a real student name",
            "Who is first rank in exam FA1?",
            "Show absentees today",
            "Marks for Rahul Kumar — replace with a real student name",
            "Attendance for Priya Sharma — replace with a real student name",
        ]

        # Module-specific suggestions based on permissions
        if 'student' in user_modules:
            suggestions.extend([
                "How do I add a new student?",
                "How do I enroll students?",
            ])
        
        if 'exam' in user_modules:
            suggestions.extend([
                "How do I create an exam schedule?",
                "How do I enter exam marks?",
            ])
        
        if 'attendance' in user_modules:
            suggestions.extend([
                "How do I mark attendance?",
                "How do I view attendance reports?",
            ])
        
        if 'fee' in user_modules:
            suggestions.extend([
                "How do I collect fees?",
                "How do I generate a fee receipt?",
            ])
        
        if 'timetable' in user_modules:
            suggestions.extend([
                "How do I create a timetable?",
                "How do I set up a period plan?",
            ])
        
        if 'staff' in user_modules or 'leave' in user_modules:
            suggestions.extend([
                "How do I manage staff leave?",
            ])
        
        if 'report' in user_modules:
            suggestions.extend([
                "What reports are available?",
            ])
        
        # If no specific permissions, show general suggestions
        if len(suggestions) < 2:
            suggestions.append("What can you help me with?")

        # Allow a few more so module + fact prompts both appear
        suggestions = suggestions[:12]
        
        return Response({
            'suggestions': suggestions
        })