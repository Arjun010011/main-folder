"""
Import json data from URL to Datababse
"""
import json
import ast

from apps.shared.models.custom_report import ReportCategory, ReportSubCategory,Report,ReportFilter,ReportColumn,SheetClassification
from django.core.management.base import BaseCommand
from rest_framework import exceptions

from apps.users.services.permissions import create_contenttypes_and_permissions, save_content_type_and_permission


class Command(BaseCommand):

    def import_customreport(self, dataList):
        reportCategoryFields = [field.name for field in ReportCategory._meta.get_fields()]
        reportSubCategoryFields = [field.name for field in ReportSubCategory._meta.get_fields()]
        reportFields = [field.name for field in Report._meta.get_fields()]
        reportSheetFields = [field.name for field in SheetClassification._meta.get_fields()]
        reportFilterFields = [field.name for field in ReportFilter._meta.get_fields()]
        reportColumnFields = [field.name for field in ReportColumn._meta.get_fields()]
        for data in dataList:
            # try:  # try and catch for saving the objects
                # data['bdu']['transaction_id'] = random.randint(0, 9)
                for category in data['reportcategory']:
                    tempCat = {}
                    for i in category:
                        if i in reportCategoryFields:
                            tempCat.update({i:category[i]})
                    try:
                        report_category = ReportCategory.objects.get(name=category['name'])
                    except ReportCategory.DoesNotExist:  #f BDU object does not exist
                        # create BDU object
                        report_category = ReportCategory(**tempCat)
                        report_category.save()
                    for subcategory in category['reportsubcategory']:
                        tempsubCat = {}
                        for i in subcategory:
                            if i in reportSubCategoryFields:
                                tempsubCat.update({i:subcategory[i]})
                        try:
                            report_subcategory = ReportSubCategory.objects.get(name=subcategory['name'])
                        except ReportSubCategory.DoesNotExist:  #f BDU object does not exist
                            # create BDU object
                            report_subcategory = ReportSubCategory(**tempsubCat)
                            report_subcategory.category=report_category
                            report_subcategory.save()
                        for report in subcategory['report']:
                            tempreport = {}
                            for i in report:
                                if i in reportFields:
                                    tempreport.update({i:report[i]})
                            try:
                                report_report = Report.objects.get(report_name=report['report_name'])
                            except Report.DoesNotExist:  #f BDU object does not exist
                                # create BDU object
                                report_report = Report(**tempreport)
                                report_report.category = report_category
                                report_report.subcategory = report_subcategory
                                report_report.save()
                            for filter in report['report_filter']:
                                tempfilter = {}
                                for i in filter:
                                    if i in reportFilterFields:
                                        tempfilter.update({i:filter[i]})
                                try:
                                    report_filter = ReportFilter.objects.get(filter_name=filter['filter_name'],report=report_report)
                                except ReportFilter.DoesNotExist:  #f BDU object does not exist
                                    # create BDU object
                                    report_filter = ReportFilter(**tempfilter)
                                    report_filter.report = report_report
                                    report_filter.save()
                            for column in report['report_column']:
                                tempcolumn = {}
                                for i in column:
                                    if i in reportColumnFields:
                                        tempcolumn.update({i:column[i]})
                                try:
                                    report_column = ReportColumn.objects.get(column_name=column['column_name'],report=report_report)
                                except ReportColumn.DoesNotExist:  #f BDU object does not exist
                                    # create BDU object
                                    report_column = ReportColumn(**tempcolumn)
                                    report_column.report = report_report
                                    report_column.save()
            
    def handle(self, *args, **options):
        f = open('apps/shared/templates/jsons/custom_report_list.json', )
        data = json.load(f)
        self.import_customreport(data)
