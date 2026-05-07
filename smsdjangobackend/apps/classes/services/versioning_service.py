import copy
from django.db import transaction
from apps.classes.models import (
    LessonPlanAcademicYear,
    LessonPlanTopicAcademicYear,
    LessonPlanSubtopicAcademicYear,
    LessonPlanSubtopicDetailAcademicYear,
    LessonPlanVersion
)
from apps.classes.serializers import LessonPlanAcademicYearReadSerializer
from apps.tenants.services.middlewares import get_current_db_name

def create_lesson_plan_snapshot(lesson_plan_acad: LessonPlanAcademicYear, user=None, change_summary: str = ""):
    """
    Serializes the entire hierarchy (Topics -> Subtopics -> Details) into a JSON dictionary.
    Saves it to the LessonPlanVersion model.
    Handles increments of version_number.
    """
    # Use the ReadSerializer to get the full nested hierarchy
    serializer = LessonPlanAcademicYearReadSerializer(lesson_plan_acad)
    snapshot = serializer.data
    
    # Get the next version number
    last_version = LessonPlanVersion.objects.filter(lesson_plan=lesson_plan_acad).order_by('-version_number').first()
    version_number = (last_version.version_number + 1) if last_version else 1
    
    version = LessonPlanVersion.objects.create(
        lesson_plan=lesson_plan_acad,
        version_number=version_number,
        snapshot=snapshot,
        change_summary=change_summary,
        created_by=user
    )
    return version

def merge_ai_content(lesson_plan_acad: LessonPlanAcademicYear, new_topics_data: list) -> list:
    """
    Implements the "Three-Way Merge" logic.
    If a detail has is_manually_edited=True, it MUST preserve the teacher's content.
    If a detail is not manually edited, it should be updated with the new AI content.
    Returns a merged topics_data structure.
    """
    # Current state from DB
    current_data = LessonPlanAcademicYearReadSerializer(lesson_plan_acad).data
    current_topics = current_data.get('topics', [])

    # Index current data for fast lookup using normalized names
    def norm(s):
        return str(s or "").strip().lower()

    indexed_current = {}
    for t in current_topics:
        t_key = norm(t.get('name'))
        indexed_current[t_key] = {
            'id': t.get('id'),
            'subtopics': {}
        }
        for st in t.get('subtopics', []):
            st_key = norm(st.get('name'))
            indexed_current[t_key]['subtopics'][st_key] = {
                'id': st.get('id'),
                'details': {}
            }
            for d in st.get('subtopic_details', []):
                d_key = norm(d.get('name'))
                indexed_current[t_key]['subtopics'][st_key]['details'][d_key] = d

    merged_topics_data = []
    for nt in new_topics_data:
        nt_name = nt.get('name')
        nt_key = norm(nt_name)
        
        merged_topic = {
            'name': nt_name,
            'sequence': nt.get('sequence', 0),
            'subtopics': []
        }
        
        curr_t = indexed_current.get(nt_key)
        if curr_t:
            merged_topic['id'] = curr_t['id']
            
        for nst in nt.get('subtopics', []):
            nst_name = nst.get('name')
            nst_key = norm(nst_name)
            
            merged_subtopic = {
                'name': nst_name,
                'sequence': nst.get('sequence', 0),
                'subtopic_details': []
            }
            
            curr_st = curr_t['subtopics'].get(nst_key) if curr_t else None
            if curr_st:
                merged_subtopic['id'] = curr_st['id']
                
            for nd in nst.get('subtopic_details', []):
                nd_name = nd.get('name')
                nd_key = norm(nd_name)
                
                curr_d = curr_st['details'].get(nd_key) if curr_st else None
                
                if curr_d and curr_d.get('is_manually_edited'):
                    # PRESERVE manual content
                    merged_detail = {
                        'id': curr_d.get('id'),
                        'name': curr_d.get('name'),
                        'objectives': curr_d.get('objectives'),
                        'activities': curr_d.get('activities'),
                        'resource': curr_d.get('resource'),
                        'assessment': curr_d.get('assessment'),
                        'allocated_from_date': curr_d.get('allocated_from_date'),
                        'allocated_to_date': curr_d.get('allocated_to_date'),
                        'allocated_to_user': curr_d.get('allocated_to_user'),
                        'completion_date': curr_d.get('completion_date'),
                        'is_manually_edited': True
                    }
                else:
                    # UPDATE with AI content
                    merged_detail = nd.copy()
                    if curr_d:
                        merged_detail['id'] = curr_d.get('id')
                    merged_detail['is_manually_edited'] = False
                    
                    # If AI didn't provide dates/user, but we have them in current, keep them?
                    # Usually it's safer to keep them if not provided by source.
                    if curr_d:
                        if not merged_detail.get('allocated_from_date'):
                            merged_detail['allocated_from_date'] = curr_d.get('allocated_from_date')
                        if not merged_detail.get('allocated_to_date'):
                            merged_detail['allocated_to_date'] = curr_d.get('allocated_to_date')
                        if not merged_detail.get('allocated_to_user'):
                            merged_detail['allocated_to_user'] = curr_d.get('allocated_to_user')

                merged_subtopic['subtopic_details'].append(merged_detail)
            merged_topic['subtopics'].append(merged_subtopic)
        merged_topics_data.append(merged_topic)
        
    return merged_topics_data

def restore_lesson_plan_version(lesson_plan_acad: LessonPlanAcademicYear, version_number: int):
    """
    Deletes current topics/subtopics/details for the plan.
    Reconstructs them from the snapshot in the specified version.
    """
    version = LessonPlanVersion.objects.get(lesson_plan=lesson_plan_acad, version_number=version_number)
    snapshot = version.snapshot
    
    from apps.classes.services.lesson_plan import create_or_update_lesson_plan_template_academic_year
    
    def strip_ids(data):
        if isinstance(data, list):
            for item in data:
                strip_ids(item)
        elif isinstance(data, dict):
            data.pop('id', None)
            for key in data:
                strip_ids(data[key])
    
    topics_data = snapshot.get('topics', [])
    topics_data_clean = copy.deepcopy(topics_data)
    strip_ids(topics_data_clean)
    
    # Academic Year, Subject, etc. can be objects in the snapshot due to ReadSerializer
    def get_id(val):
        if isinstance(val, dict):
            return val.get('id')
        return val

    payload = {
        'id': lesson_plan_acad.id,
        'academic_year': get_id(snapshot.get('academic_year')),
        'subject': get_id(snapshot.get('subject')),
        'standard_section': get_id(snapshot.get('standard_section')),
        'lesson_plan_template': get_id(snapshot.get('lesson_plan_template')),
        'topics_data': topics_data_clean,
        '_is_ai_sync': True, 
    }
    
    with transaction.atomic(using=get_current_db_name()):
        # Wipe existing to ensure clean state
        LessonPlanTopicAcademicYear.objects.filter(lesson_plan_academic_year=lesson_plan_acad).delete()
        create_or_update_lesson_plan_template_academic_year(None, payload)
    
    return lesson_plan_acad
