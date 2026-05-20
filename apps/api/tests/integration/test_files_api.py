def test_files_list(client) -> None:
    res = client.get("/api/v1/files")
    assert res.status_code == 200
