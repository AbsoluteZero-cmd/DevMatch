"""
docker compose exec backend python seed_test_data.py
"""

import app.models

from app.models.message import Message
from app.models.chatroom import ChatRoom
from app.models.chat_participant import ChatParticipant, ChatParticipantStatus
from app.models.developer_application import DeveloperApplication, ApplicationStatus
from app.models.profile import Profile, ProfileSkillTag, SkillTag
from app.models.offer import Offer, OfferStatus

from app.core.dependencies import get_db
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.models.profile import Profile, ProfileSkillTag, SkillTag
from app.models.team import (
    JobPosting,
    JobPostingStatus,
    Team,
    TeamMember,
    TeamVisibility,
)

PASSWORD = "password123"

DEVELOPERS = [
    {
        "full_name": "Alex Kim",
        "email": "alex.dev@example.com",
        "skills": ["React", "TypeScript", "Next.js"],
    },
    {
        "full_name": "Jordan Lee",
        "email": "jordan.dev@example.com",
        "skills": ["FastAPI", "PostgreSQL", "Docker"],
    },
    {
        "full_name": "Taylor Park",
        "email": "taylor.dev@example.com",
        "skills": ["PyTorch", "Pandas", "MLOps"],
    },
    {
        "full_name": "Mina Choi",
        "email": "mina.dev@example.com",
        "skills": ["Go", "Kubernetes", "gRPC"],
    },
    {
        "full_name": "Sam Rivera",
        "email": "sam.dev@example.com",
        "skills": ["Flutter", "Swift", "Kotlin"],
    },
]

LEADERS = [
    {"full_name": "Dana Leader", "email": "dana.lead@example.com"},
    {"full_name": "Chris Captain", "email": "chris.lead@example.com"},
]

TEAMS = [
    {
        "leader_email": "dana.lead@example.com",
        "name": "Nimbus Labs",
        "development_goal": "Build an AI-powered code review assistant",
        "description": "Small student team shipping a developer-tools MVP.",
        "posting": {
            "title": "Frontend Engineer",
            "required_role": "Frontend Engineer",
            "role_description": "Own the dashboard UI in Next.js + Tailwind.",
            "min_skill_level": "Intermediate",
        },
    },
    {
        "leader_email": "chris.lead@example.com",
        "name": "Orbit Systems",
        "development_goal": "Real-time collaboration platform for teams",
        "description": "Backend-heavy team building scalable services.",
        "posting": {
            "title": "Backend Engineer",
            "required_role": "Backend Engineer",
            "role_description": "Design FastAPI services and Postgres schemas.",
            "min_skill_level": "Advanced",
        },
    },
]


def get_or_create_user(db, *, full_name, email, role):
    user = db.query(User).filter(User.email == email).first()
    if user:
        print(f"  - user already exists: {email}")
        return user

    user = User(
        full_name=full_name,
        email=email,
        hashed_password=get_password_hash(PASSWORD),
        is_verified=True,
        role=role,
    )
    db.add(user)
    db.flush()

    if not db.query(Profile).filter(Profile.user_id == user.id).first():
        db.add(Profile(user_id=user.id, full_name=full_name))

    print(f"  + created {role.value.lower()}: {email}")
    return user


def seed_users(db):
    print("Seeding developers...")
    for dev in DEVELOPERS:
        get_or_create_user(
            db,
            full_name=dev["full_name"],
            email=dev["email"],
            role=UserRole.DEVELOPER,
        )

    print("Seeding team leaders...")
    for leader in LEADERS:
        get_or_create_user(
            db,
            full_name=leader["full_name"],
            email=leader["email"],
            role=UserRole.TEAM_LEADER,
        )


def seed_teams_and_postings(db):
    print("Seeding teams + job postings...")
    for spec in TEAMS:
        leader = db.query(User).filter(User.email == spec["leader_email"]).first()
        if not leader:
            print(f"  ! leader not found for team '{spec['name']}', skipping")
            continue

        team = db.query(Team).filter(Team.name == spec["name"]).first()
        if team:
            print(f"  - team already exists: {spec['name']}")
        else:
            team = Team(
                name=spec["name"],
                development_goal=spec["development_goal"],
                description=spec["description"],
                visibility=TeamVisibility.PUBLIC,
                leader_id=leader.id,
            )
            db.add(team)
            db.flush()
            # leader auto-joins as a registered member (mirrors team creation API)
            db.add(TeamMember(team_id=team.id, user_id=leader.id, is_registered=True))
            print(f"  + created team: {spec['name']} (leader: {leader.email})")

        posting = spec["posting"]
        existing = (
            db.query(JobPosting)
            .filter(
                JobPosting.team_id == team.id,
                JobPosting.title == posting["title"],
            )
            .first()
        )
        if existing:
            print(f"    - posting already exists: {posting['title']}")
        else:
            db.add(
                JobPosting(
                    team_id=team.id,
                    title=posting["title"],
                    required_role=posting["required_role"],
                    role_description=posting["role_description"],
                    min_skill_level=posting["min_skill_level"],
                    status=JobPostingStatus.OPEN,
                    is_public=True,
                )
            )
            print(f"    + created posting: {posting['title']}")


def seed_skills(db):
    """Best-effort: attach a few skill tags to each developer profile."""
    print("Attaching skill tags to developers...")
    tag_cache = {}

    def get_tag(name):
        if name in tag_cache:
            return tag_cache[name]
        tag = db.query(SkillTag).filter(SkillTag.name == name).first()
        if not tag:
            tag = SkillTag(name=name)
            db.add(tag)
            db.flush()
        tag_cache[name] = tag
        return tag

    for dev in DEVELOPERS:
        user = db.query(User).filter(User.email == dev["email"]).first()
        if not user:
            continue
        profile = db.query(Profile).filter(Profile.user_id == user.id).first()
        if not profile:
            continue
        for name in dev.get("skills", []):
            tag = get_tag(name)
            already = (
                db.query(ProfileSkillTag)
                .filter(
                    ProfileSkillTag.profile_id == profile.id,
                    ProfileSkillTag.tag_id == tag.id,
                )
                .first()
            )
            if not already:
                db.add(
                    ProfileSkillTag(
                        profile_id=profile.id,
                        tag_id=tag.id,
                        is_ai_generated=False,
                    )
                )


def main():
    gen = get_db()
    db = next(gen)
    try:
        seed_users(db)
        seed_teams_and_postings(db)
        db.commit()

        try:
            seed_skills(db)
            db.commit()
        except Exception as exc:
            db.rollback()
            print(f"  ! skipped skill tags ({exc})")

        print("\nDone. All accounts use the password: " + PASSWORD)
        print("\nTeam leaders:")
        for leader in LEADERS:
            print(f"  {leader['email']}")
        print("Developers:")
        for dev in DEVELOPERS:
            print(f"  {dev['email']}")
    except Exception:
        db.rollback()
        raise
    finally:
        gen.close()


if __name__ == "__main__":
    main()
