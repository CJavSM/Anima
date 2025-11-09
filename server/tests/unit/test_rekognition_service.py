import importlib
import types
import pytest


def test_detect_faces_and_emotions_success(monkeypatch):
    # Fake boto3.client that returns a client with detect_faces
    class FakeClient:
        def detect_faces(self, Image, Attributes):
            return {
                'FaceDetails': [
                    {
                        'Emotions': [
                            {'Type': 'HAPPY', 'Confidence': 90.1234},
                            {'Type': 'SAD', 'Confidence': 10.5}
                        ]
                    }
                ]
            }

    import boto3
    monkeypatch.setattr(boto3, 'client', lambda *args, **kwargs: FakeClient())

    # Import the module after patching boto3
    mod = importlib.reload(importlib.import_module('app.services.rekognition_service'))
    RekognitionService = mod.RekognitionService

    svc = RekognitionService()
    res = svc.detect_faces_and_emotions(b'fakebytes')
    assert res['success'] is True
    assert res['faces_detected'] == 1
    assert res['dominant_emotion']['type'] == 'HAPPY'
    # Confidence should be rounded to 2 decimals
    assert round(res['dominant_emotion']['confidence'], 2) == 90.12
    assert 'HAPPY' in res['all_emotions']
    assert isinstance(res['all_emotions']['HAPPY'], float)


def test_detect_faces_and_emotions_no_faces(monkeypatch):
    class FakeClient:
        def detect_faces(self, Image, Attributes):
            return {'FaceDetails': []}

    import boto3
    monkeypatch.setattr(boto3, 'client', lambda *args, **kwargs: FakeClient())
    mod = importlib.reload(importlib.import_module('app.services.rekognition_service'))
    RekognitionService = mod.RekognitionService

    svc = RekognitionService()
    res = svc.detect_faces_and_emotions(b'fakebytes')
    assert res['success'] is False
    assert res['faces_detected'] == 0
    assert 'error' in res


def test_detect_faces_and_emotions_client_error(monkeypatch):
    # Simulate botocore ClientError
    from botocore.exceptions import ClientError

    class FakeClient:
        def detect_faces(self, Image, Attributes):
            error_response = {'Error': {'Code': 'InvalidImageFormatException'}}
            raise ClientError(error_response, 'DetectFaces')

    import boto3
    monkeypatch.setattr(boto3, 'client', lambda *args, **kwargs: FakeClient())
    mod = importlib.reload(importlib.import_module('app.services.rekognition_service'))
    RekognitionService = mod.RekognitionService

    svc = RekognitionService()
    res = svc.detect_faces_and_emotions(b'fakebytes')
    assert res['success'] is False
    assert 'error_code' in res or 'error' in res
