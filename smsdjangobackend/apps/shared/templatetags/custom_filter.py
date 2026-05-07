from django import template

register = template.Library()

@register.filter
def count_part2(subject_list):
    """
    Count how many subjects have subject_part_type_code_name == 'part2'
    """
    if not subject_list:
        return 0
    return sum(1 for subject in subject_list if getattr(subject, "subject_part_type_code_name", None) == "part2")


@register.filter
def count_part1(subject_list):
    if not subject_list:
        return 0
    return sum(1 for subject in subject_list if getattr(subject, "subject_part_type_code_name", None) == "part1")

from collections import defaultdict


@register.filter
def group_by_date(subject_list):
    grouped = defaultdict(list)
    for subj in subject_list:
        grouped[subj.fordate].append(subj)
    # sort by date
    return sorted(grouped.items(), key=lambda x: x[0])