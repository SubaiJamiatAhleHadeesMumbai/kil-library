from models.library_management_models import IssuedBook


def test_issued_book_uses_existing_return_date_column():
    due_date_column = IssuedBook.__table__.columns["ReturnDate"]

    assert due_date_column.name == "ReturnDate"
