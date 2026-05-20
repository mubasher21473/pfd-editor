def test_edit_apply(client) -> None:
    res = client.post("/api/v1/edits/file-1", json={"operations": []})
    assert res.status_code == 200
