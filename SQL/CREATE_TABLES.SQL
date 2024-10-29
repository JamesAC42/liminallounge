CREATE TABLE boards
(
    id integer NOT NULL GENERATED ALWAYS AS IDENTITY ( INCREMENT 1 START 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1 ),
    name character varying(100) COLLATE pg_catalog."default" NOT NULL,
    description character varying(500) COLLATE pg_catalog."default" NOT NULL,
    CONSTRAINT boards_pkey PRIMARY KEY (id)
);

CREATE TABLE threads
(
    id integer NOT NULL GENERATED ALWAYS AS IDENTITY ( INCREMENT 1 START 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1 ),
    subject character varying COLLATE pg_catalog."default",
    posts integer,
    last_activity timestamp with time zone,
    board integer,
    CONSTRAINT threads_pkey PRIMARY KEY (id),
    CONSTRAINT board FOREIGN KEY (board)
        REFERENCES public.boards (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
);

CREATE TABLE posts
(
    id integer NOT NULL GENERATED ALWAYS AS IDENTITY ( INCREMENT 1 START 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1 ),
    thread integer,
    name character varying(100) COLLATE pg_catalog."default",
    content character varying(2000) COLLATE pg_catalog."default",
    time_posted timestamp with time zone,
    CONSTRAINT posts_pkey PRIMARY KEY (id),
    CONSTRAINT thread FOREIGN KEY (thread)
        REFERENCES public.threads (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
);
