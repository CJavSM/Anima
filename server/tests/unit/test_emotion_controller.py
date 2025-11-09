import importlib
from types import SimpleNamespace
import asyncio

import pytest
from fastapi import HTTPException


class FakeUploadFile:
    def __init__(self, data: bytes, filename='img.jpg', content_type='image/jpeg'):
        self._data = data
        self.filename = filename
        self.content_type = content_type

    async def read(self):
        return self._data


def make_db():
    return SimpleNamespace()


# Why/what: tests for analyze_emotion covering validation, rekognition errors, DB save success and DB save failure

def test_analyze_emotion_validation_fail(monkeypatch):
    mod = importlib.reload(importlib.import_module('app.controllers.emotion_controller'))
    file = FakeUploadFile(b'notimage')

    monkeypatch.setattr('app.controllers.emotion_controller.rekognition_service', SimpleNamespace(validate_image=lambda b: {'valid': False, 'error': 'too small'}))

    with pytest.raises(HTTPException) as exc:
        asyncio.run(mod.EmotionController.analyze_emotion(file, 'user1', db=make_db()))

    assert getattr(exc.value, 'status_code', None) == 400


def test_analyze_emotion_rekognition_fail(monkeypatch):
    mod = importlib.reload(importlib.import_module('app.controllers.emotion_controller'))
    file = FakeUploadFile(b'imagebytes')

    monkeypatch.setattr('app.controllers.emotion_controller.rekognition_service', SimpleNamespace(validate_image=lambda b: {'valid': True}, detect_faces_and_emotions=lambda b: {'success': False, 'error': 'rek error'}))

    with pytest.raises(HTTPException) as exc:
        asyncio.run(mod.EmotionController.analyze_emotion(file, 'user1', db=make_db()))

    assert getattr(exc.value, 'status_code', None) == 400


def test_analyze_emotion_success_and_db_save(monkeypatch):
    mod = importlib.reload(importlib.import_module('app.controllers.emotion_controller'))
    file = FakeUploadFile(b'imagebytes', filename='photo.png')

    rek_result = {
        'success': True,
        'faces_detected': 1,
        'dominant_emotion': {'type': 'HAPPY', 'confidence': 0.95},
        'all_emotions': {'HAPPY': 0.95, 'SAD': 0.05},
        'face_details': None
    }

    monkeypatch.setattr('app.controllers.emotion_controller.rekognition_service', SimpleNamespace(validate_image=lambda b: {'valid': True}, detect_faces_and_emotions=lambda b: rek_result))

    # fake saved analysis with id
    saved = SimpleNamespace(id=777)
    monkeypatch.setattr('app.controllers.emotion_controller.HistoryService', SimpleNamespace(create_emotion_analysis=lambda user_id, analysis_data, db: saved))

    res = asyncio.run(mod.EmotionController.analyze_emotion(file, 'user42', db=make_db()))

    assert res.success is True
    assert res.faces_detected == 1
    assert res.dominant_emotion.type == 'HAPPY'


def test_analyze_emotion_db_save_fails_but_returns_result(monkeypatch):
    mod = importlib.reload(importlib.import_module('app.controllers.emotion_controller'))
    file = FakeUploadFile(b'imagebytes')

    rek_result = {
        'success': True,
        'faces_detected': 2,
        'dominant_emotion': {'type': 'SAD', 'confidence': 0.8},
        'all_emotions': {'SAD': 0.8, 'HAPPY': 0.2},
        'face_details': None
    }

    monkeypatch.setattr('app.controllers.emotion_controller.rekognition_service', SimpleNamespace(validate_image=lambda b: {'valid': True}, detect_faces_and_emotions=lambda b: rek_result))

    def raise_save(user_id, analysis_data, db):
        raise Exception('db down')

    monkeypatch.setattr('app.controllers.emotion_controller.HistoryService', SimpleNamespace(create_emotion_analysis=raise_save))

    res = asyncio.run(mod.EmotionController.analyze_emotion(file, 'u', db=make_db()))

    # Should still return a successful analysis model despite DB failure
    assert res.success is True
    assert res.faces_detected == 2

