def test_export_trigger(client) -> None:
    res = client.post("/api/v1/export/file-1")
    assert res.status_code == 200
