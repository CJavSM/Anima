import importlib
import types
import pytest


class FakeBotoClient:
    def __init__(self, behavior='ok'):
        self.behavior = behavior

    def detect_faces(self, Image=None, Attributes=None):
        if self.behavior == 'no_faces':
            return {'FaceDetails': []}

        if self.behavior == 'client_error_invalid':
            from botocore.exceptions import ClientError
            raise ClientError({'Error': {'Code': 'InvalidImageFormatException', 'Message': 'bad image'}}, 'DetectFaces')

        # default: return one face with emotions
        return {
            'FaceDetails': [
                {
                    'AgeRange': {'Low': 25, 'High': 35},
                    'Gender': {'Value': 'Male', 'Confidence': 99.0},
                    'Smile': {'Value': True, 'Confidence': 98.0},
                    'Eyeglasses': {'Value': False, 'Confidence': 99.0},
                    'Sunglasses': {'Value': False, 'Confidence': 99.0},
                    'Beard': {'Value': False, 'Confidence': 99.0},
                    'Mustache': {'Value': False, 'Confidence': 99.0},
                    'EyesOpen': {'Value': True, 'Confidence': 99.0},
                    'MouthOpen': {'Value': False, 'Confidence': 99.0},
                    'Emotions': [
                        {'Type': 'HAPPY', 'Confidence': 80.0},
                        {'Type': 'SAD', 'Confidence': 10.0}
                    ]
                }
            ]
        }


def test_detect_faces_and_emotions_success(monkeypatch):
    # Patch boto3.client to return our fake client
    def fake_client(service_name, **kwargs):
        assert service_name == 'rekognition'
        return FakeBotoClient(behavior='ok')

    monkeypatch.setitem(importlib.import_module('sys').modules, 'boto3', types.SimpleNamespace(client=fake_client))

    importlib.reload(importlib.import_module('app.services.rekognition_service'))
    mod = importlib.import_module('app.services.rekognition_service')
    RekognitionService = mod.RekognitionService

    svc = RekognitionService()
    res = svc.detect_faces_and_emotions(b'fakebytes')
    assert res['success'] is True
    assert res['faces_detected'] == 1
    assert res['dominant_emotion']['type'] == 'HAPPY'
    assert 'HAPPY' in res['all_emotions']


def test_detect_faces_and_emotions_no_faces(monkeypatch):
    def fake_client(service_name, **kwargs):
        return FakeBotoClient(behavior='no_faces')

    monkeypatch.setitem(importlib.import_module('sys').modules, 'boto3', types.SimpleNamespace(client=fake_client))
    importlib.reload(importlib.import_module('app.services.rekognition_service'))
    mod = importlib.import_module('app.services.rekognition_service')
    RekognitionService = mod.RekognitionService

    svc = RekognitionService()
    res = svc.detect_faces_and_emotions(b'fakebytes')
    assert res['success'] is False
    assert res['faces_detected'] == 0


def test_detect_faces_and_emotions_client_error(monkeypatch):
    def fake_client(service_name, **kwargs):
        return FakeBotoClient(behavior='client_error_invalid')

    monkeypatch.setitem(importlib.import_module('sys').modules, 'boto3', types.SimpleNamespace(client=fake_client))
    importlib.reload(importlib.import_module('app.services.rekognition_service'))
    mod = importlib.import_module('app.services.rekognition_service')
    RekognitionService = mod.RekognitionService

    svc = RekognitionService()
    res = svc.detect_faces_and_emotions(b'badbytes')
    assert res['success'] is False
    assert res['error_code'] == 'InvalidImageFormatException'


def test_validate_image():
    mod = importlib.import_module('app.services.rekognition_service')
    svc = mod.rekognition_service
    # Valid JPEG header
    jpeg = b'\xff\xd8\xff' + b'0' * (1024 * 1024)
    r = svc.validate_image(jpeg, max_size_mb=2)
    assert r['valid'] is True

    # Too large
    big = b'\xff\xd8\xff' + b'0' * (6 * 1024 * 1024)
    r2 = svc.validate_image(big, max_size_mb=5)
    assert r2['valid'] is False

    # Invalid signature
    bad = b'NOPE' + b'0' * 100
    r3 = svc.validate_image(bad)
    assert r3['valid'] is False
