WARNING:  database "postgres" has no actual collation version, but a version was recorded
--
-- PostgreSQL database cluster dump
--

\restrict MXE7mvPGbd12YtOVSlVECxNd5Sph0hCVa3aTES6XnTfL2qepAfcowzg2ovDctzh

SET default_transaction_read_only = off;

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

--
-- Drop databases (except postgres and template1)
--





--
-- Drop roles
--

DROP ROLE postgres;


--
-- Roles
--

CREATE ROLE postgres;
ALTER ROLE postgres WITH SUPERUSER INHERIT CREATEROLE CREATEDB LOGIN REPLICATION BYPASSRLS PASSWORD 'SCRAM-SHA-256$4096:Et/fh/jHVcxWv45rCiP8rg==$2PBTvN1iPVQuL0/nc7KzQc/ADL9geBY8859SqRWbiLc=:1Jreuf28y+KQ9cu3JRnSQL9Bu+tU8/bVZf6YICcjFxE=';

--
-- User Configurations
--








\unrestrict MXE7mvPGbd12YtOVSlVECxNd5Sph0hCVa3aTES6XnTfL2qepAfcowzg2ovDctzh

--
-- Databases
--

--
-- Database "template1" dump
--

WARNING:  database "template1" has no actual collation version, but a version was recorded
--
-- PostgreSQL database dump
--

\restrict 9S0ZmXc2DN7qISdGDpjgWaf6pIGzUVeIw0zSpezBIVGhYdPwBPAcrQcwBbhBc5A

-- Dumped from database version 16.11
-- Dumped by pg_dump version 16.11

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

UPDATE pg_catalog.pg_database SET datistemplate = false WHERE datname = 'template1';
DROP DATABASE template1;
--
-- Name: template1; Type: DATABASE; Schema: -; Owner: postgres
--

CREATE DATABASE template1 WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'en_US.utf8';


ALTER DATABASE template1 OWNER TO postgres;

\unrestrict 9S0ZmXc2DN7qISdGDpjgWaf6pIGzUVeIw0zSpezBIVGhYdPwBPAcrQcwBbhBc5A
\connect template1
\restrict 9S0ZmXc2DN7qISdGDpjgWaf6pIGzUVeIw0zSpezBIVGhYdPwBPAcrQcwBbhBc5A

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: DATABASE template1; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON DATABASE template1 IS 'default template for new databases';


--
-- Name: template1; Type: DATABASE PROPERTIES; Schema: -; Owner: postgres
--

ALTER DATABASE template1 IS_TEMPLATE = true;


\unrestrict 9S0ZmXc2DN7qISdGDpjgWaf6pIGzUVeIw0zSpezBIVGhYdPwBPAcrQcwBbhBc5A
\connect template1
\restrict 9S0ZmXc2DN7qISdGDpjgWaf6pIGzUVeIw0zSpezBIVGhYdPwBPAcrQcwBbhBc5A

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: DATABASE template1; Type: ACL; Schema: -; Owner: postgres
--

REVOKE CONNECT,TEMPORARY ON DATABASE template1 FROM PUBLIC;
GRANT CONNECT ON DATABASE template1 TO PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict 9S0ZmXc2DN7qISdGDpjgWaf6pIGzUVeIw0zSpezBIVGhYdPwBPAcrQcwBbhBc5A

--
-- Database "postgres" dump
--

WARNING:  database "postgres" has no actual collation version, but a version was recorded
--
-- PostgreSQL database dump
--

\restrict pFTTyeCYv0FlkLDNksdqedBWmjQAq10w8NHEOCLhXoQCbGj5q20yaj42bdS07sc

-- Dumped from database version 16.11
-- Dumped by pg_dump version 16.11

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

DROP DATABASE postgres;
--
-- Name: postgres; Type: DATABASE; Schema: -; Owner: postgres
--

CREATE DATABASE postgres WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'en_US.utf8';


ALTER DATABASE postgres OWNER TO postgres;

\unrestrict pFTTyeCYv0FlkLDNksdqedBWmjQAq10w8NHEOCLhXoQCbGj5q20yaj42bdS07sc
\connect postgres
\restrict pFTTyeCYv0FlkLDNksdqedBWmjQAq10w8NHEOCLhXoQCbGj5q20yaj42bdS07sc

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: DATABASE postgres; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON DATABASE postgres IS 'default administrative connection database';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: company_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.company_role AS ENUM (
    'admin',
    'worker'
);


ALTER TYPE public.company_role OWNER TO postgres;

--
-- Name: companyrole; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.companyrole AS ENUM (
    'admin',
    'worker'
);


ALTER TYPE public.companyrole OWNER TO postgres;

--
-- Name: request_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.request_status AS ENUM (
    'pending',
    'approved',
    'rejected'
);


ALTER TYPE public.request_status OWNER TO postgres;

--
-- Name: requeststatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.requeststatus AS ENUM (
    'pending',
    'approved',
    'rejected'
);


ALTER TYPE public.requeststatus OWNER TO postgres;

--
-- Name: user_app_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_app_role AS ENUM (
    'admin',
    'user'
);


ALTER TYPE public.user_app_role OWNER TO postgres;

--
-- Name: userrole; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.userrole AS ENUM (
    'admin',
    'user'
);


ALTER TYPE public.userrole OWNER TO postgres;

--
-- Name: work_log_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.work_log_type AS ENUM (
    'particular',
    'tutorial'
);


ALTER TYPE public.work_log_type OWNER TO postgres;

--
-- Name: worklogtype; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.worklogtype AS ENUM (
    'particular',
    'tutorial'
);


ALTER TYPE public.worklogtype OWNER TO postgres;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: access_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.access_requests (
    id uuid NOT NULL,
    email character varying NOT NULL,
    first_name character varying,
    last_name character varying,
    status public.requeststatus,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.access_requests OWNER TO postgres;

--
-- Name: companies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.companies (
    id uuid NOT NULL,
    name character varying NOT NULL,
    fiscal_id character varying,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.companies OWNER TO postgres;

--
-- Name: company_members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.company_members (
    user_id uuid NOT NULL,
    company_id uuid NOT NULL,
    role public.companyrole,
    joined_at timestamp without time zone
);


ALTER TABLE public.company_members OWNER TO postgres;

--
-- Name: user_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_settings (
    user_id uuid NOT NULL,
    hourly_rate numeric(10,2),
    daily_rate numeric(10,2),
    coordination_rate numeric(10,2),
    night_rate numeric(10,2),
    is_gross boolean,
    updated_at timestamp without time zone
);


ALTER TABLE public.user_settings OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    email character varying NOT NULL,
    hashed_password character varying NOT NULL,
    first_name character varying,
    last_name character varying,
    role public.userrole,
    is_active boolean,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: work_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.work_logs (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    company_id uuid,
    type public.worklogtype NOT NULL,
    date date,
    start_time time without time zone,
    end_time time without time zone,
    start_date date,
    end_date date,
    duration_hours numeric(5,2),
    amount numeric(10,2),
    rate_applied numeric(10,2),
    is_gross_calculation boolean,
    has_coordination boolean,
    has_night boolean,
    arrives_prior boolean,
    description text,
    client character varying,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.work_logs OWNER TO postgres;

--
-- Data for Name: access_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.access_requests (id, email, first_name, last_name, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: companies; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.companies (id, name, fiscal_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: company_members; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.company_members (user_id, company_id, role, joined_at) FROM stdin;
\.


--
-- Data for Name: user_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_settings (user_id, hourly_rate, daily_rate, coordination_rate, night_rate, is_gross, updated_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, email, hashed_password, first_name, last_name, role, is_active, created_at, updated_at) FROM stdin;
5a72cc7f-98d8-488d-b477-c1dbbb69b9bf	admin@vesotel.com	$2b$12$VJXCsrqgwvwYtaXhwaEonegQ50gWK4ioCwZutEsmMl87cs4KKHeGi	Admin	User	admin	t	2025-12-07 18:29:47.274895	2025-12-07 19:01:19.260873
\.


--
-- Data for Name: work_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.work_logs (id, user_id, company_id, type, date, start_time, end_time, start_date, end_date, duration_hours, amount, rate_applied, is_gross_calculation, has_coordination, has_night, arrives_prior, description, client, created_at, updated_at) FROM stdin;
\.


--
-- Name: access_requests access_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.access_requests
    ADD CONSTRAINT access_requests_pkey PRIMARY KEY (id);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: company_members company_members_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_members
    ADD CONSTRAINT company_members_pkey PRIMARY KEY (user_id, company_id);


--
-- Name: user_settings user_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT user_settings_pkey PRIMARY KEY (user_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: work_logs work_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.work_logs
    ADD CONSTRAINT work_logs_pkey PRIMARY KEY (id);


--
-- Name: company_members company_members_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_members
    ADD CONSTRAINT company_members_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: company_members company_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_members
    ADD CONSTRAINT company_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: user_settings user_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT user_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: work_logs work_logs_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.work_logs
    ADD CONSTRAINT work_logs_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: work_logs work_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.work_logs
    ADD CONSTRAINT work_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

\unrestrict pFTTyeCYv0FlkLDNksdqedBWmjQAq10w8NHEOCLhXoQCbGj5q20yaj42bdS07sc

--
-- PostgreSQL database cluster dump complete
--

