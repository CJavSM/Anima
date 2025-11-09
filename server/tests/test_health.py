def test_root(client):
    res = client.get('/')
    assert res.status_code == 200
    body = res.json()
    assert 'message' in body


def test_health_endpoint(client):
    res = client.get('/health')
    assert res.status_code == 200
    body = res.json()
    assert body.get('status') == 'healthy'


def test_db_health(client):
    res = client.get('/health/db')
    assert res.status_code == 200
    body = res.json()
    assert body.get('status') in ('ok','error')
