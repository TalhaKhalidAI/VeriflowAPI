# App/repository/CryptoKeyRepository.py

from datetime import datetime, timezone
import logging
from typing import Optional, List, Tuple, Dict
import uuid

from sqlalchemy import select, desc
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from App.api.databases.MigrateTable import CryptoKey as CryptoKeyModel
from App.core.exceptions import (
    CryptoKeyNotFoundError,
    CryptoKeyInUseError,
    DuplicateKeyIdError,
    InvalidCryptoKeyStateError,
    InfrastructureError,
)

logger = logging.getLogger(__name__)


class CryptoKeyRepository:
    """
    Repository for Cryptographic Key operations (Veriflow Asymmetric Keys).

    Transaction policy:
        This repository does NOT commit. The service layer owns transaction
        boundaries (e.g., Database.session() commits at the end of the request).

    Error-handling convention:
        - Lookup methods (get_by_*) propagate DB errors untouched and return None
          if not found.
        - Write methods raise domain errors for business invariants
          (CryptoKeyNotFoundError, DuplicateKeyIdError, InvalidCryptoKeyStateError).
        - Driver/Integrity constraint violations are translated into domain errors.
    """

    def __init__(self, session: AsyncSession):
        self.session = session

    # ================================================================
    # INTERNAL HELPERS
    # ================================================================
    @staticmethod
    def _parse_uuid(val: str | uuid.UUID) -> Optional[uuid.UUID]:
        """Safely parse string or UUID object to prevent asyncpg type errors."""
        if isinstance(val, uuid.UUID):
            return val
        try:
            return uuid.UUID(str(val))
        except (ValueError, AttributeError):
            return None

    async def _safe_flush(self) -> None:
        """Flush pending ORM operations without committing."""
        await self.session.flush()

    # ================================================================
    # READ OPERATIONS
    # ================================================================
    async def get_by_id(
        self, key_id: str | uuid.UUID, for_update: bool = False
    ) -> Optional[CryptoKeyModel]:
        """Fetch a cryptographic key by its primary key UUID."""
        parsed_id = self._parse_uuid(key_id)
        if not parsed_id:
            return None

        stmt = select(CryptoKeyModel).where(CryptoKeyModel.id == parsed_id)
        if for_update:
            stmt = stmt.with_for_update()

        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_kid(self, kid: str) -> Optional[CryptoKeyModel]:
        """
        Fetch a key by its unique Key ID (kid).
        Critical path: used by JWT validation middleware / token verifiers.
        """
        result = await self.session.execute(
            select(CryptoKeyModel).where(CryptoKeyModel.kid == kid)
        )
        return result.scalar_one_or_none()

    async def get_latest_active_key(self) -> Optional[CryptoKeyModel]:
        """
        Fetch the most recently created active key.
        Typically used for signing new JWTs or tokens.
        """
        result = await self.session.execute(
            select(CryptoKeyModel)
            .where(CryptoKeyModel.status == "active")
            .order_by(desc(CryptoKeyModel.created_at))
            .limit(1)
        )
        return result.scalars().first()

    async def get_active_keys(self) -> List[CryptoKeyModel]:
        """
        Fetch all active keys.
        Supports key rotation windows where multiple active/valid keys
        are available in JWKS / public key sets.
        """
        result = await self.session.execute(
            select(CryptoKeyModel)
            .where(CryptoKeyModel.status == "active")
            .order_by(desc(CryptoKeyModel.created_at))
        )
        return list(result.scalars().all())

    async def list_keys(
        self,
        status: Optional[str] = None,
        created_by: Optional[int] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[CryptoKeyModel]:
        """Paginated list of keys for administration dashboards."""
        stmt = select(CryptoKeyModel).order_by(desc(CryptoKeyModel.created_at))
        if status:
            stmt = stmt.where(CryptoKeyModel.status == status)
        if created_by is not None:
            stmt = stmt.where(CryptoKeyModel.created_by == created_by)

        stmt = stmt.limit(limit).offset(offset)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    # ================================================================
    # WRITE / LIFECYCLE OPERATIONS
    # ================================================================
    async def create(
        self,
        name: str,
        kid: str,
        public_key: str,
        private_key_encrypted: str,
        created_by: Optional[int] = None,
        status: str = "active",
        issued_by: Optional[int] = None,
    ) -> CryptoKeyModel:
        """
        Register a new cryptographic key pair. Does NOT commit.

        Raises:
            DuplicateKeyIdError: If a key with this 'kid' already exists.
            InfrastructureError: If 'created_by' foreign key is invalid.
        """
        key = CryptoKeyModel(
            name=name,
            kid=kid,
            public_key=public_key,
            private_key_encrypted=private_key_encrypted,
            created_by=created_by,
            issued_by=issued_by,
            status=status,
        )
        self.session.add(key)

        try:
            await self._safe_flush()
        except IntegrityError as e:
            msg = str(e.orig).lower() if hasattr(e, "orig") and e.orig else str(e).lower()
            if "unique" in msg or "duplicate key" in msg or "ix_crypto_keys_kid" in msg:
                raise DuplicateKeyIdError(
                    f"A cryptographic key with kid='{kid}' already exists."
                ) from e
            if "foreign key" in msg:
                raise InfrastructureError(
                    f"Invalid creator user_id ({created_by}) - foreign key violation."
                ) from e
            raise

        await self.session.refresh(key)
        logger.info(f"Registered new CryptoKey: {key.id} (kid={key.kid}, name={key.name})")
        return key

    async def revoke(
        self,
        key_id: str | uuid.UUID,
        reason: str = "Revoked by admin",
    ) -> CryptoKeyModel:
        """
        Revoke an active cryptographic key. Does NOT commit.

        Raises:
            CryptoKeyNotFoundError: If the key does not exist.
            InvalidCryptoKeyStateError: If the key is already revoked or inactive.
        """
        key = await self.get_by_id(key_id, for_update=True)
        if not key:
            raise CryptoKeyNotFoundError(f"CryptoKey {key_id} not found")

        if key.status != "active":
            raise InvalidCryptoKeyStateError(
                f"Cannot revoke CryptoKey {key_id}: current status is '{key.status}'"
            )

        key.status = "revoked"
        key.revoked_at = datetime.now(timezone.utc)
        key.revocation_reason = reason

        await self._safe_flush()
        logger.warning(f"Revoked CryptoKey: {key.id} (kid={key.kid}) - Reason: {reason}")
        return key

    async def count_referencing_shifts(self, key_id: str | uuid.UUID) -> Tuple[int, int]:
        """Return (total_shifts, active_shifts) that reference this key."""
        from sqlalchemy import func, case
        from App.api.databases.MigrateTable import Shift as ShiftModel

        parsed_id = self._parse_uuid(key_id)
        if not parsed_id:
            return 0, 0
        result = await self.session.execute(
            select(
                func.count(ShiftModel.id),
                func.coalesce(func.sum(case((ShiftModel.status == "active", 1), else_=0)), 0),
            ).where(ShiftModel.key_id == parsed_id)
        )
        total, active = result.one()
        return int(total or 0), int(active or 0)

    async def delete(self, key_id: str | uuid.UUID, cascade_shifts: bool = False) -> Dict[str, int]:
        """
        Permanently delete a cryptographic key. Does NOT commit.

        - Inventory rules scoped to this key are always removed.
        - Shifts referencing the key block deletion unless cascade_shifts=True,
          in which case those shifts AND their scan history are removed too.

        Raises:
            CryptoKeyNotFoundError: If the key does not exist.
            CryptoKeyInUseError: If shifts reference the key and cascade_shifts is False.
        """
        from sqlalchemy import delete as sa_delete, func
        from App.api.databases.MigrateTable import (
            Shift as ShiftModel,
            ScanHistory as ScanHistoryModel,
            InventoryRule as InventoryRuleModel,
        )

        key = await self.get_by_id(key_id, for_update=True)
        if not key:
            raise CryptoKeyNotFoundError(f"CryptoKey {key_id} not found")

        total_shifts, active_shifts = await self.count_referencing_shifts(key.id)
        removed_scans = 0
        if total_shifts:
            if not cascade_shifts:
                # Allow deleting if all referencing shifts belong to the key owner themselves
                other_shifts_res = await self.session.execute(
                    select(func.count(ShiftModel.id)).where(
                        ShiftModel.key_id == key.id,
                        (ShiftModel.user_id != key.created_by)
                        | (
                            ShiftModel.created_by.is_not(None)
                            & (ShiftModel.created_by != key.created_by)
                        ),
                    )
                )
                other_shifts_count = int(other_shifts_res.scalar() or 0)
                if other_shifts_count > 0 or key.created_by is None:
                    raise CryptoKeyInUseError(
                        f"CryptoKey {key_id} is referenced by {total_shifts} shift(s) "
                        f"({active_shifts} active). Revoke the key instead, or delete with force=true "
                        f"(requires keys.delete.any) to also remove those shifts and their scan history."
                    )
            shift_ids = select(ShiftModel.id).where(ShiftModel.key_id == key.id).scalar_subquery()
            scan_res = await self.session.execute(
                sa_delete(ScanHistoryModel).where(ScanHistoryModel.shift_id.in_(shift_ids))
            )
            removed_scans = scan_res.rowcount or 0
            await self.session.execute(sa_delete(ShiftModel).where(ShiftModel.key_id == key.id))

        rule_res = await self.session.execute(
            sa_delete(InventoryRuleModel).where(InventoryRuleModel.key_id == key.id)
        )
        removed_rules = rule_res.rowcount or 0

        await self.session.delete(key)
        await self._safe_flush()
        logger.warning(
            f"Deleted CryptoKey {key.id} (kid={key.kid}); removed {removed_rules} rules, "
            f"{total_shifts if cascade_shifts else 0} shifts, {removed_scans} scans"
        )
        return {
            "removed_rules": removed_rules,
            "removed_shifts": total_shifts if cascade_shifts else 0,
            "removed_active_shifts": active_shifts if cascade_shifts else 0,
            "removed_scans": removed_scans,
        }
