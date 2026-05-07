from apps.canteen.models import Order, OrderItem
from apps.canteen.serializers import OrderReadSerializer, OrderItemReadSerializer
from apps.institutes.models import Institute
from apps.shared.services import PDFService


def generate_receipt(self):
    order = Order.objects.get(id=self.kwargs['pk'])
    order_data = OrderReadSerializer(order).data
    items = order.order_item_order.filter(is_active=True)
    items_data = OrderItemReadSerializer(items, many=True).data
    institute = Institute.get_institute(self)

    template_path = 'canteen/canteen_order_receipt.html'
    number_of_copies = 1

    data = {
        'order': order_data,
        'items': items_data,
        'institute': institute,
        'number_of_copies': range(number_of_copies),
    }

    options = {
        'page-width': '80mm',
        'page-height': '297mm',
        'margin-top': '0',
        'margin-right': '0',
        'margin-bottom': '0',
        'margin-left': '0',
        'encoding': 'UTF-8',
    }

    return PDFService.receipt_new(
        self, data, f'canteen_receipt_{order.order_number}', template_path, False, options
    )
