from apps.institutes.models import FinancialYear
from apps.payroll.models.payroll import SalaryComponent, SalaryPlan, SalaryEmployeePlan, SalaryEmployeeMonthPlan
from apps.staffs.models import Staff


def add_salary_data(self):
    self.financial_year = FinancialYear.objects.create(start_date='2020-06-01', end_date='2021-04-30')
    self.salary_component = SalaryComponent.objects.create(name='Basic Pay')
    self.salary_plan = SalaryPlan.objects.create(financial_year=self.financial_year, rate='10000',
                                                 salary_component=self.salary_component)
    self.staff1 = Staff.objects.create(first_name='Staff1', gender='M', date_joined='2020-06-01', salary=10000)
    self.staff2 = Staff.objects.create(first_name='Staff2', gender='F', date_joined='2020-06-01', salary=10000)
    self.sep = SalaryEmployeePlan.objects.create(staff=self.staff1, salary_component=self.salary_component,
                                                 amount=10000)
    self.semp = SalaryEmployeeMonthPlan.objects.create(staff=self.staff1, salary_component=self.salary_component,
                                                       amount=10000, salary_month='2020-06-01')
    self.neg_data = {'earnings': [], 'deductions': [], 'gross_earnings': 0.0, 'gross_deductions': 0.0, 'net_pay': 0.0}
